/**
 * LocalOptimizer - High-precision prompt optimization
 * Handles both conversational prompts AND error logs intelligently.
 */

export interface OptimizeResult {
  original: string;
  optimized: string;
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  intent: string;
  estimatedOutputSavings: number;
}

export class LocalOptimizer {
  
  estimateTokens(text: string): number {
    if (!text) return 0;
    const hasCode = /```|`[^`]+`/.test(text);
    return Math.ceil(text.length / (hasCode ? 3.5 : 4));
  }

  optimize(input: string): OptimizeResult {
    const original = input.trim();
    
    if (!original) {
      return {
        original: input,
        optimized: '',
        originalTokens: 0,
        optimizedTokens: 0,
        savings: 0,
        intent: 'general',
        estimatedOutputSavings: 0,
      };
    }

    const originalTokens = this.estimateTokens(original);

    // Detect if this is primarily error/log output
    const isErrorLog = this.isErrorLog(original);
    
    let optimized: string;
    let intent: string;
    
    if (isErrorLog) {
      optimized = this.optimizeErrorLog(original);
      intent = 'debug';
    } else {
      optimized = this.optimizePrompt(original);
      intent = this.detectIntent(original);
    }

    // Don't make things worse
    if (optimized.length >= original.length * 0.95) {
      optimized = original;
    }

    const optimizedTokens = this.estimateTokens(optimized);
    const savings = original === optimized ? 0 : Math.max(0, Math.round((1 - optimizedTokens / originalTokens) * 100));
    const estimatedOutputSavings = savings >= 50 ? Math.round(savings * 0.5) : Math.round(savings * 0.3);

    return {
      original: input,
      optimized,
      originalTokens,
      optimizedTokens,
      savings,
      intent,
      estimatedOutputSavings,
    };
  }

  /**
   * Detect if input is primarily error/log output vs conversational prompt
   */
  private isErrorLog(text: string): boolean {
    const indicators = [
      /\bat\s+\S+\s+\([^)]+:\d+:\d+\)/i,  // JS Stack trace: at Function (file:line:col)
      /^\s*at\s+/m,  // Lines starting with "at "
      /FAIL\s+\S+\.test\.[jt]s/i,  // Jest test failures
      /Error:.*\n\s+at\s+/,  // Error followed by stack
      /Module not found/i,
      /webpack compiled with \d+ error/i,
      /npm ERR!/,
      /ENOENT|EACCES|ECONNREFUSED/,
      /\d+\s*\|\s*(const|let|var|function|class|import|return|if|for|while)/,  // Code with line numbers
      /exit code: \d+/i,
      /##\[error\]/i,
      // Java/Spring Boot patterns
      /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+(INFO|WARN|ERROR|DEBUG)/,  // Spring Boot log format
      /Caused by:\s+\w+\.\w+Exception/,  // Java exception chains
      /APPLICATION FAILED TO START/,
      /at\s+\w+\.\w+\.\w+\([^)]+\.java:\d+\)/,  // Java stack trace
      /Exception:\s+\w/,  // General exception pattern
      /\.java:\d+\)/,  // Java line numbers
      // Python patterns
      /^(INFO|ERROR|WARNING|DEBUG):\s+/m,  // Python logging format
      /Traceback \(most recent call last\)/,  // Python traceback
      /File ".*", line \d+/,  // Python stack frame
      /^\s+raise\s+\w+/m,  // Python raise statement
      /\w+Error:\s+/,  // Python errors (ValueError, TypeError, etc.)
      /\w+Exception:\s+/,  // Python exceptions
      // Go patterns
      /^panic:\s+/m,  // Go panic
      /^goroutine\s+\d+\s+\[running\]/m,  // Go goroutine header
      /^\s+\/\S+\.go:\d+/m,  // Go stack frame with .go file
      /\[signal SIG[A-Z]+:/,  // Go signal
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+(INFO|WARN|ERROR|DEBUG)/,  // Structured Go logs (Zap/Zerolog)
      /gorm:/i,  // GORM logs
      /CrashLoopBackOff/,  // Kubernetes
    ];
    
    const matchCount = indicators.filter(p => p.test(text)).length;
    return matchCount >= 2;
  }

  private detectIntent(text: string): string {
    const lower = text.toLowerCase();
    if (/\b(error|exception|bug|fix|crash|undefined|null|typeerror)\b/.test(lower)) return 'debug';
    if (/\b(explain|what is|how does|why does)\b/.test(lower)) return 'explain';
    if (/\b(create|build|implement|write|generate|make|add)\b/.test(lower)) return 'create';
    return 'general';
  }

  /**
   * Optimize error logs - deduplicate, keep essential info
   * Handles: Node/JS errors, Java/Spring Boot exceptions, webpack errors
   */
  private optimizeErrorLog(input: string): string {
    const lines = input.split('\n');
    const sections: string[] = [];
    
    // Track unique errors to deduplicate
    const seenErrors = new Set<string>();
    const seenStackTraces = new Set<string>();
    
    // Patterns for noise to remove
    const noisePatterns = [
      /^##\[error\]/i,
      /^info\s+-\s+Using/i,
      /^info\s+-\s+Node version/i,
      /^info\s+-\s+Platform/i,
      /^info\s+-\s+Process/i,
      /^\(node:\d+\)\s+ExperimentalWarning/i,
      /^\(Use `node --trace-warnings/i,
      /^-+\s*(Captured|Additional|Repeated|More noise|Nested cause|Another nested)/i,
      /^-+$/,
      /^console\.error$/,
      /^\s*$/,
      // Spring Boot INFO lines (not errors)
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+INFO/,
      // Maven/CI wrapper repetitive errors
      /^\[ERROR\]\s+Failed to execute goal.*Process terminated with exit code/,
      // Python INFO lines (Uvicorn, etc.)
      /^INFO:\s+/,
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+/,
      // Python context lines that aren't useful
      /^The above exception was the direct cause/,
      /^During handling of the above exception/,
      /^\s*\(repeated \d+ times\)\s*$/,
      // Go INFO logs
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+INFO\s+/,
      // Go server startup info
      /Listening on :\d+/,
      /Starting API server/,
      /Loaded config from/,
      /connection established/i,
      /Connecting to.*:\d+/,
      // Go shutdown info
      /Shutting down server/,
      /Closing database connections/,
      /Server shutdown complete/,
    ];
    
    // Node internals to skip in stack traces
    const internalPatterns = [
      /node:internal\//,
      /node_modules\/jest/,
      /node_modules\/.*queueRunner/,
      /at new Promise/,
      /at mapper\s/,
      /at Object\.asyncJestTest/,
      /at Module\._compile/,
      /at Module\._extensions/,
      /at Module\.load/,
      /at Module\._load/,
      /at Function\.executeUserEntryPoint/,
      /at node:internal/,
      // Java internals
      /org\.springframework\.beans\.factory\.support\./,
      /org\.springframework\.context\.support\./,
      /org\.springframework\.boot\.SpringApplication\./,
      /org\.hibernate\.boot\./,
      /org\.hibernate\.service\.internal\./,
      /org\.hibernate\.jpa\.boot\./,
      /java\.base\/java\.util\.concurrent\./,
      /\.\.\. \d+ common frames omitted/,
      // Python internals (SQLAlchemy, Starlette, FastAPI, uvicorn)
      /site-packages\/sqlalchemy\//,
      /site-packages\/starlette\//,
      /site-packages\/fastapi\//,
      /site-packages\/uvicorn\//,
      /site-packages\/anyio\//,
      /site-packages\/httpx\//,
      /File "<string>"/,
      // Go internals
      /\/usr\/local\/go\/src\//,
      /github\.com\/gin-gonic\/gin/,
      /net\/http\..*\.ServeHTTP/,
      /net\/http\.\(\*conn\)\.serve/,
      /net\/http\.serverHandler/,
      /created by net\/http/,
      /database\/sql\.\(\*DB\)/,
    ];

    let currentError: string[] = [];
    let inStackTrace = false;
    let stackFrameCount = 0;
    let codeContext: string[] = [];
    let inCodeContext = false;
    
    // Special: Extract APPLICATION FAILED TO START block
    let appFailedBlock: string[] = [];
    let inAppFailedBlock = false;
    
    const flushError = () => {
      if (currentError.length === 0) return;
      
      const errorText = currentError.join('\n').trim();
      // Create a signature for deduplication
      const firstLine = errorText.split('\n')[0];
      // Extract error type + message for dedup (strip file locations)
      const errorSig = firstLine
        .replace(/\s+at\s+.*$/, '')
        .replace(/\([^)]+\.java:\d+\)/, '')
        .replace(/\([^)]+:\d+:\d+\)/, '')
        .trim();
      
      // Skip if we've seen this exact error message before
      if (seenErrors.has(errorSig)) {
        currentError = [];
        stackFrameCount = 0;
        inStackTrace = false;
        return;
      }
      
      seenErrors.add(errorSig);
      sections.push(errorText);
      currentError = [];
      stackFrameCount = 0;
      inStackTrace = false;
    };

    const flushCodeContext = () => {
      if (codeContext.length > 0) {
        sections.push(codeContext.join('\n'));
        codeContext = [];
      }
      inCodeContext = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // === APPLICATION FAILED TO START block handling ===
      if (/\*+\s*$/.test(line) && lines[i + 1]?.includes('APPLICATION FAILED TO START')) {
        inAppFailedBlock = true;
        appFailedBlock = [];
        continue;
      }
      
      if (inAppFailedBlock) {
        if (/^\*+\s*$/.test(line)) {
          // End of block header
          continue;
        }
        // Check if we're leaving the block (another section starts)
        if (/^-+\s+/.test(line) || /^\d{4}-\d{2}-\d{2}/.test(line)) {
          inAppFailedBlock = false;
          // Don't continue - process this line normally
        } else {
          // Keep all content in the APPLICATION FAILED TO START block
          const trimmed = line.trim();
          if (trimmed) {
            appFailedBlock.push(trimmed);
          }
          continue;
        }
      }
      
      // Skip noise
      if (noisePatterns.some(p => p.test(line))) continue;
      
      // Detect code context (lines with | showing source)
      const codeMatch = line.match(/^\s*(\d+)\s*\|\s*(.+)/);
      if (codeMatch) {
        if (!inCodeContext) flushError();
        inCodeContext = true;
        codeContext.push(line.trim());
        continue;
      }
      
      // Detect error pointer (the ^ line)
      if (/^\s*\|?\s*\^/.test(line)) {
        codeContext.push(line.trim());
        continue;
      }
      
      if (inCodeContext && codeContext.length > 0) {
        flushCodeContext();
      }
      
      // === Go panic detection ===
      const goPanicMatch = line.match(/^panic:\s*(.+)/);
      if (goPanicMatch) {
        flushError();
        currentError.push(`panic: ${goPanicMatch[1]}`);
        inStackTrace = false;
        continue;
      }
      
      // === Go signal line (SIGSEGV, etc.) ===
      const goSignalMatch = line.match(/^\[signal (SIG\w+):\s*([^\]]+)\]/);
      if (goSignalMatch) {
        const [, signal, desc] = goSignalMatch;
        currentError.push(`[${signal}: ${desc}]`);
        continue;
      }
      
      // === Go goroutine header ===
      if (/^goroutine\s+\d+\s+\[running\]:/.test(line)) {
        // Skip - just marker for stack trace start
        inStackTrace = true;
        stackFrameCount = 0;
        continue;
      }
      
      // === Go stack frame: package.Function(args) ===
      const goFrameMatch = line.match(/^(\S+\/)?(\w+(?:\.\(\*?\w+\))?\.[\w.]+)\(([^)]*)\)$/);
      if (goFrameMatch && inStackTrace) {
        // This is a function line, next line will be the file:line
        // Keep the function if it's user code
        const funcName = goFrameMatch[2];
        const isInternal = internalPatterns.some(p => p.test(line));
        if (!isInternal && stackFrameCount < 3) {
          currentError.push(`  ${funcName}()`);
        }
        continue;
      }
      
      // === Go file:line reference ===
      const goFileMatch = line.match(/^\s+(\S+\.go):(\d+)/);
      if (goFileMatch && inStackTrace) {
        const [, filepath, lineNum] = goFileMatch;
        const isInternal = internalPatterns.some(p => p.test(filepath));
        if (!isInternal && stackFrameCount < 3) {
          // Shorten the path
          const shortPath = filepath.replace(/.*\/go\/pkg\/mod\//, '').replace(/.*\/app\//, '');
          currentError.push(`    ${shortPath}:${lineNum}`);
          stackFrameCount++;
        }
        continue;
      }
      
      // === Go structured ERROR/WARN logs ===
      const goLogMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+(ERROR|WARN)\s+(\S+):(\d+)\s+(.+)/);
      if (goLogMatch) {
        const [, level, file, lineNum, message] = goLogMatch;
        const sig = `${level}: ${message.slice(0, 50)}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          flushError();
          currentError.push(`${level} ${file}:${lineNum} ${message}`);
        }
        inStackTrace = false;
        continue;
      }
      
      // === Go Gin recovery panic ===
      if (/^\[Recovery\] panic recovered/.test(line)) {
        // Skip - we already have the panic
        continue;
      }
      
      // === GORM SQL query ===
      const gormMatch = line.match(/^gorm:\s*\[[\d-T:Z.]+\]\s*(.+)/);
      if (gormMatch) {
        const query = gormMatch[1];
        if (query.includes('SELECT') || query.includes('INSERT') || query.includes('UPDATE') || query.includes('DELETE')) {
          if (!seenErrors.has('gorm:' + query.slice(0, 30))) {
            seenErrors.add('gorm:' + query.slice(0, 30));
            sections.push(`SQL: ${query}`);
          }
        }
        continue;
      }
      
      // === K8s/Container errors ===
      const k8sMatch = line.match(/Reason=(CrashLoopBackOff|OOMKilled|Error)/);
      if (k8sMatch) {
        const sig = `k8s: ${k8sMatch[1]}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          flushError();
          currentError.push(`K8s: ${k8sMatch[1]}`);
        }
        continue;
      }
      
      // === Go structured log with error field ===
      const goErrorFieldMatch = line.match(/error="([^"]+)"/);
      if (goErrorFieldMatch) {
        const errorMsg = goErrorFieldMatch[1];
        const sig = `error: ${errorMsg.slice(0, 40)}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          // Extract context from the log line
          const ctxMatch = line.match(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s+\w+\s+(\S+)\s+(.+?)(?:\s+error=)/);
          if (ctxMatch) {
            currentError.push(`${ctxMatch[2]}: ${errorMsg}`);
          } else {
            currentError.push(`Error: ${errorMsg}`);
          }
        }
        continue;
      }
      
      // === Skip Go WARN retry lines (just noise) ===
      if (/Retrying.*\(attempt \d+\/\d+\)/.test(line)) {
        continue;
      }
      
      // === Go liveness/health probe failures ===
      const probeMatch = line.match(/(Liveness|Readiness|Health)\s+probe\s+failed/i);
      if (probeMatch) {
        const sig = 'probe:failed';
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          currentError.push(`${probeMatch[1]} probe failed`);
        }
        continue;
      }
      
      // === Python Traceback header ===
      if (/^Traceback \(most recent call last\):/.test(line)) {
        // Start of Python traceback - flush previous and prepare for new
        flushError();
        inStackTrace = true;
        stackFrameCount = 0;
        continue;
      }
      
      // === Python ERROR: line (but not if followed by traceback) ===
      const pythonErrorLine = line.match(/^ERROR:\s+(.+)/);
      if (pythonErrorLine) {
        const msg = pythonErrorLine[1];
        // Skip generic "Exception in ASGI application" - the real error follows
        if (msg.includes('Exception in ASGI application')) {
          continue;
        }
        const sig = `ERROR: ${msg.slice(0, 50)}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          flushError();
          currentError.push(`ERROR: ${msg}`);
        }
        inStackTrace = false;
        continue;
      }

      // === Python stack frame: File "...", line X, in Y ===
      const pythonFrameMatch = line.match(/^\s*File "([^"]+)", line (\d+), in (.+)/);
      if (pythonFrameMatch) {
        const [, filepath, lineNum, funcName] = pythonFrameMatch;
        inStackTrace = true;
        
        // Skip internal frames
        if (internalPatterns.some(p => p.test(filepath))) {
          continue;
        }
        
        // Keep only first few relevant frames (user code, not library code)
        if (stackFrameCount < 3) {
          // Shorten the path if it's long
          const shortPath = filepath.replace(/.*site-packages\//, '').replace(/.*\/usr\/local\/lib\/.*\//, '');
          seenStackTraces.add(`${shortPath}:${lineNum}`);
          currentError.push(`  File "${shortPath}", line ${lineNum}, in ${funcName}`);
          stackFrameCount++;
        }
        continue;
      }

      // === Python code context line (indented code after File line) ===
      if (inStackTrace && /^\s{4,}\S/.test(line) && !line.includes('File "')) {
        // This is the actual code line - keep it with the frame
        if (stackFrameCount <= 3 && currentError.length > 0) {
          currentError.push('    ' + line.trim());
        }
        continue;
      }

      // === Java/Python Exception detection ===
      // Pattern: org.something.SomeException: message OR just SomeException: message
      const exceptionMatch = line.match(/^(\s*)((?:[\w.]+\.)?(?:\w+Exception|\w+Error)):\s*(.+)/);
      if (exceptionMatch) {
        const [, indent, fullExType, message] = exceptionMatch;
        // Extract just the exception class name for cleaner output
        const exType = fullExType.split('.').pop() || fullExType;
        const errorSig = `${exType}: ${message.slice(0, 60)}`;
        
        if (!seenErrors.has(errorSig)) {
          seenErrors.add(errorSig);
          if (indent && indent.length > 2) {
            // Nested exception - add to current
            currentError.push(`${exType}: ${message}`);
          } else {
            flushError();
            currentError.push(`${exType}: ${message}`);
          }
        } else {
          // Duplicate - skip this entire error block
          flushError();
          inStackTrace = true;
          stackFrameCount = 999;
          continue;
        }
        inStackTrace = false;
        stackFrameCount = 0;
        continue;
      }
      
      // Spring Boot log line with ERROR/WARN
      const springLogMatch = line.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+(ERROR|WARN)\s+\d+\s+---\s+\[[^\]]+\]\s+(\S+)\s*:\s*(.+)/);
      if (springLogMatch) {
        const [, level, logger, message] = springLogMatch;
        // Keep ERROR lines, skip WARN unless it's important
        if (level === 'ERROR' || message.includes('Could not')) {
          flushError();
          currentError.push(`${level}: ${message}`);
          inStackTrace = false;
        }
        continue;
      }
      
      // Detect new JS error
      const jsErrorMatch = line.match(/^((?:Type|Reference|Syntax|Range|Module|Resolve)?Error)[\s:]/i);
      if (jsErrorMatch) {
        const errorMsgSig = line.trim().replace(/\s+at\s+.*$/, '');
        if (seenErrors.has(errorMsgSig)) {
          currentError = [];
          inStackTrace = true;
          stackFrameCount = 999;
          continue;
        }
        seenErrors.add(errorMsgSig);
        if (currentError.length === 1 && currentError[0].startsWith('●')) {
          currentError.push(line.trim());
        } else {
          flushError();
          currentError.push(line.trim());
        }
        inStackTrace = false;
        continue;
      }
      
      // FAIL and ERROR lines (webpack/build errors)
      const buildErrorMatch = line.match(/^(FAIL|ERROR\s+in)[\s:]/i);
      if (buildErrorMatch) {
        flushError();
        currentError.push(line.trim());
        inStackTrace = false;
        continue;
      }
      
      // Detect start of stack trace (Java or JS)
      if (/^\s*at\s+/.test(line)) {
        inStackTrace = true;
        
        // Skip internal frames
        if (internalPatterns.some(p => p.test(line))) continue;
        
        // Only keep first few relevant frames
        if (stackFrameCount < 3) {
          const stackSig = line.trim();
          if (!seenStackTraces.has(stackSig)) {
            seenStackTraces.add(stackSig);
            currentError.push('  ' + line.trim());
            stackFrameCount++;
          }
        }
        continue;
      }
      
      // Detect "Caused by:" - PRESERVE THE FULL LINE including exception
      const causedByMatch = line.match(/^Caused by:\s*(\S+):\s*(.+)/);
      if (causedByMatch) {
        const [, exType, message] = causedByMatch;
        const sig = `Caused by: ${exType}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          flushError();
          currentError.push(`Caused by: ${exType}: ${message}`);
          inStackTrace = false;
          stackFrameCount = 0;
        } else {
          // Duplicate - flush and skip this entire error block
          flushError();
          inStackTrace = true;
          stackFrameCount = 999; // Skip all following stack frames
        }
        continue;
      }
      
      // Module resolution errors - keep the important parts
      if (/Module not found|Can't resolve/.test(line)) {
        flushError();
        currentError.push(line.trim());
        continue;
      }
      
      // Test suite info
      if (/^\s*●\s+/.test(line)) {
        flushError();
        currentError.push(line.trim());
        continue;
      }
      
      // Keep webpack compilation summary
      if (/webpack compiled with \d+ error/.test(line)) {
        flushError();
        sections.push(line.trim());
        continue;
      }
      
      // Skip resolution noise (verbose webpack/node resolution output)
      if (/Field 'browser'|Parsed request|using description file|resolve as module|single file module|doesn't exist|looking for modules|no extension|\.ts doesn't exist|\.tsx doesn't exist|\.js doesn't exist|\.json doesn't exist|is not a directory/.test(line)) {
        continue;
      }
      
      // Skip standalone "resolve 'X' in 'Y'" lines (webpack verbose)
      if (/^resolve ['"]/.test(line.trim())) {
        continue;
      }
      
      // AWS SDK connection errors - extract the important bits
      const awsSdkMatch = line.match(/SdkClientException:\s*(.+)/);
      if (awsSdkMatch) {
        const sig = `AWS: ${awsSdkMatch[1].slice(0, 50)}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          flushError();
          currentError.push(`AWS SDK: ${awsSdkMatch[1]}`);
        }
        continue;
      }
      
      // SQL context (useful for debugging)
      if (/^\[SQL:/.test(line) || /^\[parameters:/.test(line)) {
        if (currentError.length > 0) {
          currentError.push(line.trim());
        }
        continue;
      }
      
      // SQLAlchemy error link - skip
      if (/^\(Background on this error/.test(line)) {
        continue;
      }
      
      // If we're in an error, add context lines (but not too many)
      if (currentError.length > 0 && !inStackTrace && currentError.length < 5) {
        const trimmed = line.trim();
        if (trimmed && trimmed.length > 5) {
          currentError.push(trimmed);
        }
      }
    }
    
    // Flush remaining
    flushError();
    flushCodeContext();
    
    // Build final output
    let result = sections.join('\n\n').trim();
    
    // Add APPLICATION FAILED TO START block if we captured it
    if (appFailedBlock.length > 0) {
      // Remove duplicate header if present
      const filteredBlock = appFailedBlock.filter(line => !line.includes('APPLICATION FAILED TO START'));
      result += '\n\nAPPLICATION FAILED TO START\n' + filteredBlock.join('\n');
    }
    
    // Add header if we significantly reduced
    if (sections.length > 0 || appFailedBlock.length > 0) {
      result = 'Fix these errors:\n\n' + result;
    }
    
    return result || input;
  }

  /**
   * Optimize conversational prompts - remove fluff, condense
   */
  private optimizePrompt(input: string): string {
    // Extract tech stack
    const stackMatches = input.match(/\b(react|vue|angular|typescript|javascript|python|nodejs|node\.js|dynamodb|mongodb|postgresql|mysql|redis|aws|gcp|azure|oauth|nextjs|express)\b/gi) || [];
    const stack = [...new Set(stackMatches.map(s => s.toLowerCase().replace('.', '')))].slice(0, 4);

    // === STEP 1: Extract code blocks ===
    const codeBlocks: string[] = [];
    let text = input;

    // Fenced code
    text = text.replace(/```[\w]*\s*([\s\S]*?)```/g, (_, code: string) => {
      if (code.trim()) codeBlocks.push(code.trim());
      return '\n[[CODE]]\n';
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, (_, code: string) => {
      if (code.trim()) codeBlocks.push(code.trim());
      return '[[INLINE]]';
    });

    // === STEP 2: Remove fluff ===
    // Greetings
    text = text.replace(/^(hey|hi|hello|please\?*|so|okay|alright|well)\s*[,!.]?\s*/i, '');
    
    const junkPatterns: RegExp[] = [
      // Emotional
      /i'?m\s+having\s+(this\s+)?(an?\s+)?(annoying\s+)?/gi,
      /i'?m\s+(so\s+)?(frustrated|confused|stuck|going\s+crazy)[^.!?\n]*[.!?]?\s*/gi,
      /i'?ve\s+been\s+(trying|working|debugging)[^.!?\n]*[.!?]?\s*/gi,
      /this\s+(is\s+)?(so\s+)?(frustrating|confusing|annoying|stupid)[^.!?\n]*[.!?]?\s*/gi,
      /i'?ve\s+tried\s+everything[.!?]?\s*/gi,
      /nothing\s+(works|is\s+working)[.!?]?\s*/gi,
      /(and\s+)?i\s+don'?t\s+know\s+(why|what\s+to\s+do)[^.!?\n]*[.!?]?\s*/gi,
      // Help requests
      /(please\s*)?(can\s+you\s+)?(please\s+)?help(\s+me)?(\s+fix)?(\s+this)?[.!?]?\s*/gi,
      /my\s+(deadline|boss|manager)[^.!?\n]*[.!?]?\s*/gi,
      /i\s+(really\s+)?need\s+this\s+working[^.!?\n]*[.!?]?\s*/gi,
      // Fragments
      /that\s+occurs?\s+up\.?\s*/gi,
      /it\?+\.+\s*/gi,
      /i\s+tried[^.!?\n]*but\.?\s*/gi,
      /i\s+need\s+(this\s+)?(code\s+)?(to\s+be\s+)?(super\s+)?(advanced|good|perfect)[^.!?\n]*\.?\s*/gi,
    ];
    
    for (const p of junkPatterns) {
      text = text.replace(p, ' ');
    }
    
    // Signoffs
    text = text.replace(/thanks?\s*(so\s+much|in\s+advance|a\s+lot|you)?[.!?]*\s*$/gi, '');
    
    // Fillers
    text = text.replace(/\b(basically|honestly|really|actually|literally|just|very|simply|obviously|anymore)\b/gi, '');
    text = text.replace(/\b(i\s+think|i\s+believe|i\s+guess|you\s+know|i\s+mean)\b/gi, '');
    
    // === STEP 3: Condense verbose phrases ===
    const condensers: [RegExp, string][] = [
      [/\bi\s+want\s+to\s+build\s+(a\s+)?/gi, 'Build: '],
      [/\bi\s+would\s+like\s+(to\s+)?(build|create|make|have)\s+(a\s+)?/gi, 'Build: '],
      [/\bi\s+need\s+to\s+(build|create|make|implement)\s+(a\s+)?/gi, 'Build: '],
      [/\bi\s+want\s+to\s+(create|make|implement)\s+(a\s+)?/gi, 'Build: '],
      [/\bthe\s+system\s+should\s+use\s+/gi, 'Use: '],
      [/\bit\s+should\s+use\s+/gi, 'Use: '],
      [/\bi\s+would\s+like\s+it\s+to\s+be\s+/gi, ''],
      [/\bit\s+should\s+be\s+/gi, ''],
      [/\bthere\s+should\s+(only\s+)?(ever\s+)?be\s+/gi, 'Constraint: '],
      [/\bstored\s+in\s+/gi, 'Store: '],
      [/\bsstored\s+in\s+/gi, 'Store: '],
      [/\b(futuristic|modern),?\s*(clean|minimal),?\s*(dark|light),?\s*(looking|themed|style)?\.?\.?\.?\s*/gi, 'UI: $1, $2, $3. '],
      [/\b(a\s+)?feature\s+for\s+(a\s+)?/gi, ''],
      [/\b(a\s+)?user\s+login\s+screen/gi, 'login screen'],
      [/\btied\s+to\s+an?\s+account/gi, 'per account'],
      [/\b1\s+email\s+/gi, 'unique email '],
    ];
    
    for (const [pattern, replacement] of condensers) {
      text = text.replace(pattern, replacement);
    }
    
    // Remove placeholders
    text = text.replace(/\[\[INLINE\]\]/g, '');
    text = text.replace(/\[\[CODE\]\]/g, '');
    
    // === STEP 4: Cleanup ===
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\s*([.!?,])\s*/g, '$1 ')
      .replace(/([.!?])\s*([.!?])+/g, '$1')
      .replace(/^\s*[.!?,]\s*/g, '')
      .replace(/\s*[.!?,]\s*$/g, '')
      .replace(/:\s*:/g, ':')
      .replace(/\.\s*\./g, '.')
      .replace(/Build:\s*Build:/gi, 'Build:')
      .trim();
    
    // === STEP 5: Build output ===
    const parts: string[] = [];

    if (stack.length > 0) {
      parts.push(`[${stack.join(', ')}]`);
    }

    if (text.length > 10) {
      parts.push(text);
    }

    for (const code of codeBlocks) {
      parts.push('```\n' + code + '\n```');
    }

    let result = parts.join('\n').trim();
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    return result || input;
  }
}
