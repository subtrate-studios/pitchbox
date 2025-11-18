import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult } from './CodebaseAnalyzer';
import type { FlowExtractionResult } from './FlowExtractor';

export interface ScriptGenerationOptions {
  style?: 'technical' | 'business' | 'casual';
  targetDuration?: number; // in seconds
  focusAreas?: string[];
  includeCodeExamples?: boolean;
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
  };
}

export interface ScriptSection {
  title: string;
  content: string;
  duration: number;
  type: 'introduction' | 'feature' | 'flow' | 'technical' | 'conclusion';
}

export class ScriptGeneratorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ScriptGeneratorError';
  }
}

export class ScriptGenerator {
  private readonly anthropic: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new ScriptGeneratorError('Anthropic API key is required');
    }

    this.anthropic = new Anthropic({ apiKey });
  }

  async generate(
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult,
    repoUrl: string,
    options: ScriptGenerationOptions = {}
  ): Promise<DemoScript> {
    const style = options.style || 'business';
    const targetDuration = options.targetDuration || 180; // 3 minutes default

    try {
      const prompt = this.buildPrompt(analysis, flowResult, repoUrl, options);

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
        throw new ScriptGeneratorError('Unexpected response format from Claude');
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
        },
      };
    } catch (error) {
      if (error instanceof ScriptGeneratorError) {
        throw error;
      }
      throw new ScriptGeneratorError('Failed to generate demo script', error);
    }
  }

  private buildPrompt(
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult,
    repoUrl: string,
    options: ScriptGenerationOptions
  ): string {
    const { style = 'business', targetDuration = 180, focusAreas = [] } = options;

    const context = this.buildContext(analysis, flowResult);

    return `You are a professional product demo voiceover script writer. Create a concise, punchy script for a ${targetDuration}-second product demo video.

CRITICAL: This script will be read aloud by text-to-speech (ElevenLabs) WHILE a screen recording plays. The visuals will show what you're describing, so you DON'T need to explain every detail.

# Product Context
- Repository: ${repoUrl}
- Tech Stack: ${analysis.techStack.languages.join(', ')}
- Frameworks: ${analysis.techStack.frameworks.join(', ') || 'None'}
${focusAreas.length > 0 ? `- Focus On: ${focusAreas.join(', ')}` : ''}

# Project Context
${context}

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

  private buildContext(analysis: AnalysisResult, flowResult: FlowExtractionResult): string {
    const parts: string[] = [];

    // README content if available
    const readme = analysis.keyFiles.find(f => f.relativePath.toLowerCase().includes('readme'));
    if (readme && readme.content) {
      const excerpt = readme.content.slice(0, 1000);
      parts.push(`## README Excerpt\n${excerpt}`);
    }

    // Features
    if (flowResult.features.length > 0) {
      parts.push(`## Key Features\n${flowResult.features.map(f => `- ${f.name}: ${f.description}`).join('\n')}`);
    }

    // User Flows
    if (flowResult.userFlows.length > 0) {
      parts.push(`## User Flows\n${flowResult.userFlows.map(flow =>
        `- ${flow.name}: ${flow.description}\n  Steps: ${flow.steps.join(' → ')}`
      ).join('\n')}`);
    }

    // API Endpoints
    if (flowResult.apiEndpoints.length > 0) {
      const endpointSummary = flowResult.apiEndpoints.slice(0, 10).map(ep => `${ep.method} ${ep.path}`).join(', ');
      parts.push(`## API Endpoints\n${endpointSummary}`);
    }

    // UI Components
    if (flowResult.uiComponents.length > 0) {
      parts.push(`## UI Components\n${flowResult.uiComponents.slice(0, 15).join(', ')}`);
    }

    // Dependencies
    if (analysis.dependencies.production.length > 0) {
      parts.push(`## Key Dependencies\n${analysis.dependencies.production.slice(0, 10).join(', ')}`);
    }

    return parts.join('\n\n');
  }

  private parseScriptSections(scriptText: string, targetDuration: number): ScriptSection[] {
    const sections: ScriptSection[] = [];
    const lines = scriptText.split('\n');

    let currentSection: Partial<ScriptSection> | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if this is a section header
      if (trimmed.startsWith('## ')) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection as ScriptSection);
        }

        // Start new section
        const title = trimmed.replace('## ', '');
        const type = this.determineSectionType(title);

        currentSection = {
          title,
          type,
          duration: 0, // Will calculate after
        };
        currentContent = [];
      } else if (currentSection && trimmed) {
        currentContent.push(line);
      }
    }

    // Add last section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection as ScriptSection);
    }

    // Calculate durations (rough estimate: 150 words per minute, 2.5 words per second)
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
    if (lower.includes('conclusion') || lower.includes('wrap') || lower.includes('closing')) return 'conclusion';
    if (lower.includes('feature')) return 'feature';
    if (lower.includes('flow') || lower.includes('journey')) return 'flow';
    if (lower.includes('technical') || lower.includes('architecture')) return 'technical';
    return 'feature';
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractKeywords(analysis: AnalysisResult, flowResult: FlowExtractionResult): string[] {
    const keywords = new Set<string>();

    // Add tech stack
    analysis.techStack.languages.forEach(lang => keywords.add(lang));
    analysis.techStack.frameworks.forEach(fw => keywords.add(fw));

    // Add feature names
    flowResult.features.forEach(f => keywords.add(f.name));

    // Add flow names
    flowResult.userFlows.forEach(f => keywords.add(f.name));

    return Array.from(keywords).slice(0, 20);
  }
}
