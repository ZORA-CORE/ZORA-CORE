/**
 * EIVOR SICA Protocol (Self-Improving Cognitive Architecture)
 * Recursive Learning Loop for Post-Mortem Analysis
 * Analyzes PR build-logs and feedback, extracts lessons, updates playbooks
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

import { createHash } from 'crypto';
import { MemoryEngine, getGlobalMemoryEngine } from './engine';
import type {
  PostMortemInput,
  PostMortemResult,
  Lesson,
  Pattern,
  AgentId,
  SICAProtocolState,
  InteractionTrace,
} from './types';

const LESSON_EXTRACTION_PATTERNS = {
  build_failure: [
    { pattern: /error TS\d+/gi, category: 'technical', template: 'TypeScript compilation error detected' },
    { pattern: /cannot find module/gi, category: 'technical', template: 'Missing module dependency' },
    { pattern: /type .+ is not assignable/gi, category: 'technical', template: 'Type mismatch error' },
    { pattern: /eslint|lint error/gi, category: 'process', template: 'Linting rules violation' },
    { pattern: /test failed|assertion error/gi, category: 'technical', template: 'Test failure detected' },
    { pattern: /timeout|timed out/gi, category: 'technical', template: 'Operation timeout' },
    { pattern: /memory|heap|out of memory/gi, category: 'technical', template: 'Memory issue detected' },
  ],
  review_feedback: [
    { pattern: /please add|missing|should include/gi, category: 'process', template: 'Missing component or documentation' },
    { pattern: /refactor|clean up|simplify/gi, category: 'architecture', template: 'Code quality improvement needed' },
    { pattern: /security|vulnerability|unsafe/gi, category: 'technical', template: 'Security concern raised' },
    { pattern: /performance|slow|optimize/gi, category: 'technical', template: 'Performance optimization needed' },
    { pattern: /climate|carbon|emission/gi, category: 'climate', template: 'Climate-related feedback' },
    { pattern: /test|coverage|testing/gi, category: 'process', template: 'Testing improvement needed' },
  ],
};

export class SICAProtocol {
  private memoryEngine: MemoryEngine;
  private state: SICAProtocolState;
  private reasoningTrace: string[] = [];

  constructor(memoryEngine?: MemoryEngine) {
    this.memoryEngine = memoryEngine || getGlobalMemoryEngine();
    this.state = {
      active: false,
      phase: 'idle',
      lessons_extracted: 0,
      playbooks_updated: [],
      reasoning_trace: [],
    };
    this.addTrace('SICA Protocol initialized');
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [SICA] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
    this.state.reasoning_trace.push(entry);
  }

  async runPostMortem(input: PostMortemInput): Promise<PostMortemResult> {
    this.addTrace('Starting Post-Mortem analysis', { pr: input.pr_number });
    this.state.active = true;
    this.state.phase = 'analyzing';
    this.state.current_pr = input.pr_number;

    const lessons: Lesson[] = [];
    const patternsDetected: Pattern[] = [];
    const playbookUpdates: Array<{ agent_id: AgentId; section: string; content: string }> = [];

    this.state.phase = 'extracting';
    this.addTrace('Extracting lessons from build logs and feedback');

    if (input.build_logs) {
      const buildLessons = this.extractLessonsFromBuildLogs(input.build_logs, input.pr_number);
      lessons.push(...buildLessons);
      this.addTrace('Extracted lessons from build logs', { count: buildLessons.length });
    }

    if (input.review_feedback && input.review_feedback.length > 0) {
      const feedbackLessons = this.extractLessonsFromFeedback(input.review_feedback, input.pr_number);
      lessons.push(...feedbackLessons);
      this.addTrace('Extracted lessons from review feedback', { count: feedbackLessons.length });
    }

    const topLessons = this.prioritizeLessons(lessons).slice(0, 3);
    this.state.lessons_extracted = topLessons.length;

    const patterns = this.detectPatternsFromLessons(topLessons);
    patternsDetected.push(...patterns);

    this.state.phase = 'updating';
    this.addTrace('Generating playbook updates');

    for (const lesson of topLessons) {
      const update = this.generatePlaybookUpdate(lesson);
      if (update) {
        playbookUpdates.push(update);
        this.state.playbooks_updated.push(update.agent_id);
      }
    }

    const trace = await this.storePostMortemTrace(input, topLessons, patternsDetected);

    this.state.phase = 'complete';
    this.state.active = false;

    const memoryHash = createHash('sha256')
      .update(`postmortem_${input.pr_number}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);

    this.addTrace('Post-Mortem complete', {
      lessons: topLessons.length,
      patterns: patternsDetected.length,
      updates: playbookUpdates.length,
    });

    return {
      trace_id: trace.id,
      lessons: topLessons,
      patterns_detected: patternsDetected,
      playbook_updates: playbookUpdates,
      memory_hash: memoryHash,
      reasoning_trace: this.getReasoningTrace(),
    };
  }

  private extractLessonsFromBuildLogs(logs: string, prNumber: number): Lesson[] {
    const lessons: Lesson[] = [];
    const timestamp = Date.now();

    for (const { pattern, category, template } of LESSON_EXTRACTION_PATTERNS.build_failure) {
      const matches = logs.match(pattern);
      if (matches && matches.length > 0) {
        const context = this.extractContext(logs, matches[0]);
        const lesson: Lesson = {
          id: `lesson_build_${prNumber}_${lessons.length}`,
          timestamp,
          source_trace_id: `pr_${prNumber}`,
          agent_id: 'thor',
          category: category as Lesson['category'],
          title: template,
          description: `${template}: ${context}`,
          prevention_strategy: this.generatePreventionStrategy(category, template),
          memory_hash: createHash('sha256')
            .update(`${template}_${context}_${timestamp}`)
            .digest('hex')
            .substring(0, 16),
          applied_count: 0,
        };
        lessons.push(lesson);
      }
    }

    return lessons;
  }

  private extractLessonsFromFeedback(feedback: string[], prNumber: number): Lesson[] {
    const lessons: Lesson[] = [];
    const timestamp = Date.now();

    for (const comment of feedback) {
      for (const { pattern, category, template } of LESSON_EXTRACTION_PATTERNS.review_feedback) {
        if (pattern.test(comment)) {
          const lesson: Lesson = {
            id: `lesson_feedback_${prNumber}_${lessons.length}`,
            timestamp,
            source_trace_id: `pr_${prNumber}`,
            agent_id: this.determineResponsibleAgent(category),
            category: category as Lesson['category'],
            title: template,
            description: `${template}: ${comment.substring(0, 200)}`,
            prevention_strategy: this.generatePreventionStrategy(category, template),
            memory_hash: createHash('sha256')
              .update(`${template}_${comment}_${timestamp}`)
              .digest('hex')
              .substring(0, 16),
            applied_count: 0,
          };
          lessons.push(lesson);
          break;
        }
      }
    }

    return lessons;
  }

  private extractContext(logs: string, match: string): string {
    const index = logs.indexOf(match);
    if (index === -1) return match;

    const start = Math.max(0, index - 50);
    const end = Math.min(logs.length, index + match.length + 100);
    return logs.substring(start, end).replace(/\n/g, ' ').trim();
  }

  private generatePreventionStrategy(category: string, template: string): string {
    const strategies: Record<string, Record<string, string>> = {
      technical: {
        'TypeScript compilation error detected': 'Run `npm run typecheck` before committing',
        'Missing module dependency': 'Verify all imports and run `npm install` after adding dependencies',
        'Type mismatch error': 'Use strict TypeScript types and avoid `any`',
        'Test failure detected': 'Run `npm test` locally before pushing',
        'Operation timeout': 'Add timeout handling and optimize long-running operations',
        'Memory issue detected': 'Profile memory usage and implement cleanup',
        'Security concern raised': 'Run security audit and follow OWASP guidelines',
        'Performance optimization needed': 'Profile performance and optimize hot paths',
      },
      process: {
        'Linting rules violation': 'Run `npm run lint` before committing',
        'Missing component or documentation': 'Follow PR checklist and add documentation',
        'Testing improvement needed': 'Increase test coverage for new code',
      },
      architecture: {
        'Code quality improvement needed': 'Follow established patterns and request architecture review',
      },
      climate: {
        'Climate-related feedback': 'Verify climate claims with TYR before publishing',
      },
    };

    return strategies[category]?.[template] || `Review and address: ${template}`;
  }

  private determineResponsibleAgent(category: string): AgentId {
    const agentMap: Record<string, AgentId> = {
      technical: 'thor',
      process: 'odin',
      architecture: 'odin',
      climate: 'tyr',
      collaboration: 'odin',
    };
    return agentMap[category] || 'eivor';
  }

  private prioritizeLessons(lessons: Lesson[]): Lesson[] {
    const categoryPriority: Record<string, number> = {
      technical: 3,
      process: 2,
      architecture: 2,
      climate: 4,
      collaboration: 1,
    };

    return lessons.sort((a, b) => {
      const priorityDiff = (categoryPriority[b.category] || 0) - (categoryPriority[a.category] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });
  }

  private detectPatternsFromLessons(lessons: Lesson[]): Pattern[] {
    const patterns: Pattern[] = [];
    const categoryGroups = new Map<string, Lesson[]>();

    for (const lesson of lessons) {
      if (!categoryGroups.has(lesson.category)) {
        categoryGroups.set(lesson.category, []);
      }
      categoryGroups.get(lesson.category)!.push(lesson);
    }

    for (const [category, categoryLessons] of categoryGroups) {
      if (categoryLessons.length >= 2) {
        const pattern: Pattern = {
          id: `pattern_${category}_${Date.now()}`,
          name: `Recurring ${category} issues`,
          description: `Multiple ${category} lessons detected in this PR`,
          trace_ids: categoryLessons.map(l => l.source_trace_id),
          occurrence_count: categoryLessons.length,
          first_seen: Math.min(...categoryLessons.map(l => l.timestamp)),
          last_seen: Math.max(...categoryLessons.map(l => l.timestamp)),
          category,
          prevention_strategies: categoryLessons
            .filter(l => l.prevention_strategy)
            .map(l => l.prevention_strategy!),
          memory_hash: createHash('sha256')
            .update(`pattern_${category}_${categoryLessons.length}`)
            .digest('hex')
            .substring(0, 16),
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private generatePlaybookUpdate(
    lesson: Lesson
  ): { agent_id: AgentId; section: string; content: string } | null {
    const agentId = lesson.agent_id;
    const timestamp = new Date().toISOString();

    const content = `
### SICA Lesson [${timestamp}]
- **Source**: ${lesson.source_trace_id}
- **Category**: ${lesson.category}
- **Title**: ${lesson.title}
- **Description**: ${lesson.description}
${lesson.prevention_strategy ? `- **Prevention**: ${lesson.prevention_strategy}` : ''}
- **Memory Hash**: ${lesson.memory_hash}
`;

    return {
      agent_id: agentId,
      section: 'SICA Lessons',
      content: content.trim(),
    };
  }

  private async storePostMortemTrace(
    input: PostMortemInput,
    lessons: Lesson[],
    patterns: Pattern[]
  ): Promise<InteractionTrace> {
    const trace = await this.memoryEngine.encodeTrajectory(
      'pr_postmortem',
      'eivor',
      {
        task: `Post-Mortem Analysis for PR #${input.pr_number}`,
        task_key: `pr_postmortem_${input.pr_number}`,
        state: {
          pr_number: input.pr_number,
          pr_url: input.pr_url,
          deployment_status: input.deployment_status,
        },
      },
      {
        type: 'post_mortem_analysis',
        parameters: {
          has_build_logs: !!input.build_logs,
          feedback_count: input.review_feedback?.length || 0,
        },
        reasoning_trace: this.reasoningTrace.slice(-10),
      },
      {
        status: input.deployment_status === 'success' ? 'success' : 'failure',
        score: lessons.length > 0 ? 0.8 : 0.5,
        artifacts: [
          { type: 'pr', id: String(input.pr_number), url: input.pr_url },
        ],
        duration_ms: input.duration_ms,
      },
      lessons.map(l => l.description)
    );

    return trace;
  }

  getState(): SICAProtocolState {
    return { ...this.state };
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
    this.state.reasoning_trace = [];
  }
}

export function createSICAProtocol(memoryEngine?: MemoryEngine): SICAProtocol {
  return new SICAProtocol(memoryEngine);
}
