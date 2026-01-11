import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'crypto';
import { getApiKeyByHash, getUser, incrementUsage } from '../lib/dynamodb';
import { success, badRequest, unauthorized, forbidden, serverError } from '../lib/response';

// Hash API key
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ============================================
// PROMPT OPTIMIZATION ENGINE
// ============================================

// Filler words and phrases to remove
const FILLER_PATTERNS = [
  /\b(basically|essentially|actually|literally|really|very|just|simply|obviously|clearly)\b/gi,
  /\b(i think|i believe|i guess|i suppose|i mean|you know|like)\b/gi,
  /\b(kind of|sort of|type of)\b/gi,
  /\b(in order to)\b/g,
  /\b(the fact that)\b/g,
  /\b(at this point in time)\b/gi,
  /\b(due to the fact that)\b/gi,
  /\b(for the purpose of)\b/gi,
  /\b(in the event that)\b/gi,
  /\b(it is important to note that)\b/gi,
  /\b(please note that)\b/gi,
  /\b(as you can see)\b/gi,
  /\b(as mentioned (above|below|earlier|before|previously))\b/gi,
  /\b(in my opinion)\b/gi,
  /\b(to be honest)\b/gi,
  /\b(at the end of the day)\b/gi,
  /\b(when it comes to)\b/gi,
  /\b(the thing is)\b/gi,
  /\b(i was wondering if)\b/gi,
  /\b(would it be possible to)\b/gi,
  /\b(i would appreciate it if you could)\b/gi,
  /\b(thanks in advance)\b/gi,
  /\b(thank you so much)\b/gi,
  /\b(i really need|i desperately need)\b/gi,
  /\b(as soon as possible|asap)\b/gi,
  /\b(if that makes sense)\b/gi,
  /\b(does that make sense)\b/gi,
  /\b(if you know what i mean)\b/gi,
  /\b(and stuff|and things|etc\.?)\b/gi,
];

// Emotional/filler phrases that don't add value
const EMOTIONAL_FILLERS = [
  /\b(i'?m (so )?frustrated|this is (so )?frustrating|ugh|argh)\b/gi,
  /\b(i'?ve been (trying|working on) (this )?(for (hours|days|weeks)|all day))\b/gi,
  /\b(i'?m (really )?stuck|i'?m lost|i'?m confused)\b/gi,
  /\b(my (boss|manager|client|deadline) (is|will be))\b/gi,
  /\b(this is urgent|this is critical|this is important)\b/gi,
  /\b(please help|can someone help|need help)\b/gi,
  /\b(any help (would be|is) (greatly )?appreciated)\b/gi,
];

// Normalize whitespace and formatting
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Remove filler words and phrases
function removeFluff(text: string): string {
  let result = text;

  // Remove filler patterns
  FILLER_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, '');
  });

  // Remove emotional fillers
  EMOTIONAL_FILLERS.forEach((pattern) => {
    result = result.replace(pattern, '');
  });

  // Clean up resulting whitespace
  result = result.replace(/\s+/g, ' ').replace(/\s+([.,!?])/g, '$1');

  return result.trim();
}

// Detect and extract code blocks
function extractCodeBlocks(text: string): { text: string; codeBlocks: string[] } {
  const codeBlocks: string[] = [];
  let blockIndex = 0;

  // Extract fenced code blocks
  const processedText = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `{{CODE_BLOCK_${blockIndex++}}}`;
  });

  // Extract inline code
  const finalText = processedText.replace(/`[^`]+`/g, (match) => {
    codeBlocks.push(match);
    return `{{CODE_BLOCK_${blockIndex++}}}`;
  });

  return { text: finalText, codeBlocks };
}

// Restore code blocks
function restoreCodeBlocks(text: string, codeBlocks: string[]): string {
  let result = text;
  codeBlocks.forEach((block, index) => {
    result = result.replace(`{{CODE_BLOCK_${index}}}`, block);
  });
  return result;
}

// Deduplicate repeated information
function dedupeBlocks(text: string): string {
  const lines = text.split('\n');
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    const normalizedLine = line.trim().toLowerCase();
    // Skip empty lines or very short lines
    if (normalizedLine.length < 10) {
      deduped.push(line);
      continue;
    }
    // Skip if we've seen this exact line
    if (!seen.has(normalizedLine)) {
      seen.add(normalizedLine);
      deduped.push(line);
    }
  }

  return deduped.join('\n');
}

// Extract constraints and requirements
function extractConstraints(text: string): {
  constraints: string[];
  stack: string[];
  requirements: string[];
} {
  const constraints: string[] = [];
  const stack: string[] = [];
  const requirements: string[] = [];

  // Tech stack patterns
  const stackPatterns = [
    /using\s+(react|vue|angular|svelte|next\.?js|nuxt|gatsby)/gi,
    /\b(typescript|javascript|python|java|c\+\+|rust|go|ruby)\b/gi,
    /\b(node\.?js|deno|bun)\b/gi,
    /\b(mongodb|postgresql|mysql|sqlite|dynamodb|redis)\b/gi,
    /\b(aws|gcp|azure|vercel|netlify)\b/gi,
    /\b(docker|kubernetes|k8s)\b/gi,
  ];

  stackPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => {
        if (!stack.includes(m.toLowerCase())) {
          stack.push(m);
        }
      });
    }
  });

  // Requirement patterns
  const reqPatterns = [
    /must\s+(?:be|have|include|support)\s+([^.!?\n]+)/gi,
    /should\s+(?:be|have|include|support)\s+([^.!?\n]+)/gi,
    /needs?\s+to\s+([^.!?\n]+)/gi,
    /require[sd]?\s+([^.!?\n]+)/gi,
  ];

  reqPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const req = match[1].trim();
      if (req.length > 5 && req.length < 100 && !requirements.includes(req)) {
        requirements.push(req);
      }
    }
  });

  // Constraint patterns
  const constraintPatterns = [
    /without\s+([^.!?\n]+)/gi,
    /can'?t\s+use\s+([^.!?\n]+)/gi,
    /no\s+([^.!?\n]+)/gi,
    /avoid\s+([^.!?\n]+)/gi,
  ];

  constraintPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const constraint = match[1].trim();
      if (constraint.length > 3 && constraint.length < 50 && !constraints.includes(constraint)) {
        constraints.push(constraint);
      }
    }
  });

  return { constraints, stack, requirements };
}

// Detect the primary intent of the prompt
function detectIntent(text: string): string {
  const lowerText = text.toLowerCase();

  // Bug/error fixing
  if (
    lowerText.includes('error') ||
    lowerText.includes('bug') ||
    lowerText.includes('fix') ||
    lowerText.includes('not working') ||
    lowerText.includes("doesn't work") ||
    lowerText.includes('broken')
  ) {
    return 'fix';
  }

  // Explanation/understanding
  if (
    lowerText.includes('explain') ||
    lowerText.includes('how does') ||
    lowerText.includes('what is') ||
    lowerText.includes('why does') ||
    lowerText.includes('understand')
  ) {
    return 'explain';
  }

  // Implementation/creation
  if (
    lowerText.includes('create') ||
    lowerText.includes('build') ||
    lowerText.includes('implement') ||
    lowerText.includes('make') ||
    lowerText.includes('add') ||
    lowerText.includes('write')
  ) {
    return 'implement';
  }

  // Review/optimization
  if (
    lowerText.includes('review') ||
    lowerText.includes('optimize') ||
    lowerText.includes('improve') ||
    lowerText.includes('refactor') ||
    lowerText.includes('better')
  ) {
    return 'optimize';
  }

  // Debugging
  if (lowerText.includes('debug') || lowerText.includes('console.log') || lowerText.includes('trace')) {
    return 'debug';
  }

  return 'general';
}

// Format the optimized prompt
function formatOptimizedPrompt(
  cleanedText: string,
  intent: string,
  metadata: {
    constraints: string[];
    stack: string[];
    requirements: string[];
  }
): string {
  const parts: string[] = [];

  // Add intent header
  const intentLabels: Record<string, string> = {
    fix: '**Bug Fix Request**',
    explain: '**Explanation Request**',
    implement: '**Implementation Request**',
    optimize: '**Optimization Request**',
    debug: '**Debug Request**',
    general: '**Request**',
  };

  parts.push(intentLabels[intent] || '**Request**');
  parts.push('');

  // Add main content
  parts.push(cleanedText);

  // Add metadata sections if they exist
  if (metadata.stack.length > 0) {
    parts.push('');
    parts.push(`**Stack**: ${metadata.stack.join(', ')}`);
  }

  if (metadata.requirements.length > 0) {
    parts.push('');
    parts.push('**Requirements**:');
    metadata.requirements.forEach((req) => {
      parts.push(`- ${req}`);
    });
  }

  if (metadata.constraints.length > 0) {
    parts.push('');
    parts.push('**Constraints**:');
    metadata.constraints.forEach((c) => {
      parts.push(`- ${c}`);
    });
  }

  return parts.join('\n');
}

// Estimate token count (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  // Code tends to have more tokens per character
  const hasCode = text.includes('```') || text.includes('`');
  const multiplier = hasCode ? 3.5 : 4;
  return Math.ceil(text.length / multiplier);
}

// Main optimization function
function optimizePrompt(input: string): {
  original: string;
  optimized: string;
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  intent: string;
} {
  const original = input;
  const originalTokens = estimateTokens(original);

  // Step 1: Normalize
  let text = normalize(original);

  // Step 2: Extract code blocks to preserve them
  const { text: textWithoutCode, codeBlocks } = extractCodeBlocks(text);

  // Step 3: Remove fluff from non-code text
  let cleanedText = removeFluff(textWithoutCode);

  // Step 4: Deduplicate
  cleanedText = dedupeBlocks(cleanedText);

  // Step 5: Extract metadata
  const metadata = extractConstraints(original);

  // Step 6: Detect intent
  const intent = detectIntent(original);

  // Step 7: Restore code blocks
  cleanedText = restoreCodeBlocks(cleanedText, codeBlocks);

  // Step 8: Final cleanup
  cleanedText = normalize(cleanedText);

  // Step 9: Format final output
  const optimized = formatOptimizedPrompt(cleanedText, intent, metadata);

  const optimizedTokens = estimateTokens(optimized);
  const savings = Math.round((1 - optimizedTokens / originalTokens) * 100);

  return {
    original,
    optimized,
    originalTokens,
    optimizedTokens,
    savings: Math.max(0, savings),
    intent,
  };
}

// Lambda handler
export async function optimize(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get API key from header
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];

    if (!apiKey) {
      return unauthorized('API key is required');
    }

    // Validate API key
    const keyHash = hashKey(apiKey);
    const keyRecord = await getApiKeyByHash(keyHash);

    if (!keyRecord) {
      return unauthorized('Invalid API key');
    }

    // Check subscription
    const user = await getUser(keyRecord.userId);
    if (!user || (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing')) {
      return forbidden('Active subscription required');
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return badRequest('Text is required');
    }

    if (text.length > 50000) {
      return badRequest('Text exceeds maximum length of 50,000 characters');
    }

    // Optimize the prompt
    const result = optimizePrompt(text);

    // Track usage
    await incrementUsage(keyRecord.userId, 1, result.originalTokens - result.optimizedTokens);

    return success(result);
  } catch (error: any) {
    console.error('Optimize error:', error);
    return serverError(error.message);
  }
}













