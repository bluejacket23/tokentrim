/**
 * Test file for LocalOptimizer - error log handling
 * Run with: node test-error-log.js
 */

// Inline the optimizer for testing
class LocalOptimizer {
  estimateTokens(text) {
    if (!text) return 0;
    const hasCode = /```|`[^`]+`/.test(text);
    return Math.ceil(text.length / (hasCode ? 3.5 : 4));
  }

  optimize(input) {
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
    const isErrorLog = this.isErrorLog(original);
    
    let optimized;
    let intent;
    
    if (isErrorLog) {
      optimized = this.optimizeErrorLog(original);
      intent = 'debug';
    } else {
      optimized = original; // Skip prompt optimization for this test
      intent = 'general';
    }

    if (optimized.length >= original.length * 0.95) {
      optimized = original;
    }

    const optimizedTokens = this.estimateTokens(optimized);
    const savings = original === optimized ? 0 : Math.max(0, Math.round((1 - optimizedTokens / originalTokens) * 100));

    return {
      original: input,
      optimized,
      originalTokens,
      optimizedTokens,
      savings,
      intent,
    };
  }

  isErrorLog(text) {
    const indicators = [
      /\bat\s+\S+\s+\([^)]+:\d+:\d+\)/i,
      /^\s*at\s+/m,
      /FAIL\s+\S+\.test\.[jt]s/i,
      /Error:.*\n\s+at\s+/,
      /Module not found/i,
      /webpack compiled with \d+ error/i,
      /npm ERR!/,
      /ENOENT|EACCES|ECONNREFUSED/,
      /\d+\s*\|\s*(const|let|var|function|class|import|return|if|for|while)/,
      /exit code: \d+/i,
      /##\[error\]/i,
      /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+(INFO|WARN|ERROR|DEBUG)/,
      /Caused by:\s+\w+\.\w+Exception/,
      /APPLICATION FAILED TO START/,
      /at\s+\w+\.\w+\.\w+\([^)]+\.java:\d+\)/,
      /Exception:\s+\w/,
      /\.java:\d+\)/,
      // Python patterns
      /^(INFO|ERROR|WARNING|DEBUG):\s+/m,
      /Traceback \(most recent call last\)/,
      /File ".*", line \d+/,
      /^\s+raise\s+\w+/m,
      /\w+Error:\s+/,
      /\w+Exception:\s+/,
    ];
    
    const matchCount = indicators.filter(p => p.test(text)).length;
    return matchCount >= 2;
  }

  optimizeErrorLog(input) {
    const lines = input.split('\n');
    const sections = [];
    
    const seenErrors = new Set();
    const seenStackTraces = new Set();
    
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
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+INFO/,
      /^\[ERROR\]\s+Failed to execute goal.*Process terminated with exit code/,
      // Python INFO lines
      /^INFO:\s+/,
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+/,
      /^The above exception was the direct cause/,
      /^During handling of the above exception/,
      /^\s*\(repeated \d+ times\)\s*$/,
    ];
    
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
      /org\.springframework\.beans\.factory\.support\./,
      /org\.springframework\.context\.support\./,
      /org\.springframework\.boot\.SpringApplication\./,
      /org\.hibernate\.boot\./,
      /org\.hibernate\.service\.internal\./,
      /org\.hibernate\.jpa\.boot\./,
      /java\.base\/java\.util\.concurrent\./,
      /\.\.\. \d+ common frames omitted/,
      // Python internals
      /site-packages\/sqlalchemy\//,
      /site-packages\/starlette\//,
      /site-packages\/fastapi\//,
      /site-packages\/uvicorn\//,
      /site-packages\/anyio\//,
      /site-packages\/httpx\//,
      /File "<string>"/,
    ];

    let currentError = [];
    let inStackTrace = false;
    let stackFrameCount = 0;
    let codeContext = [];
    let inCodeContext = false;
    
    let appFailedBlock = [];
    let inAppFailedBlock = false;
    
    const flushError = () => {
      if (currentError.length === 0) return;
      
      const errorText = currentError.join('\n').trim();
      const firstLine = errorText.split('\n')[0];
      const errorSig = firstLine
        .replace(/\s+at\s+.*$/, '')
        .replace(/\([^)]+\.java:\d+\)/, '')
        .replace(/\([^)]+:\d+:\d+\)/, '')
        .trim();
      
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
      
      // APPLICATION FAILED TO START block
      if (/\*+\s*$/.test(line) && lines[i + 1]?.includes('APPLICATION FAILED TO START')) {
        inAppFailedBlock = true;
        appFailedBlock = [];
        continue;
      }
      
      if (inAppFailedBlock) {
        if (/^\*+\s*$/.test(line)) continue;
        if (/^-+\s+/.test(line) || /^\d{4}-\d{2}-\d{2}/.test(line)) {
          inAppFailedBlock = false;
        } else {
          const trimmed = line.trim();
          if (trimmed) appFailedBlock.push(trimmed);
          continue;
        }
      }
      
      if (noisePatterns.some(p => p.test(line))) continue;
      
      const codeMatch = line.match(/^\s*(\d+)\s*\|\s*(.+)/);
      if (codeMatch) {
        if (!inCodeContext) flushError();
        inCodeContext = true;
        codeContext.push(line.trim());
        continue;
      }
      
      if (/^\s*\|?\s*\^/.test(line)) {
        codeContext.push(line.trim());
        continue;
      }
      
      if (inCodeContext && codeContext.length > 0) {
        flushCodeContext();
      }
      
      // Python Traceback header
      if (/^Traceback \(most recent call last\):/.test(line)) {
        flushError();
        inStackTrace = true;
        stackFrameCount = 0;
        continue;
      }
      
      // Python ERROR: line
      const pythonErrorLine = line.match(/^ERROR:\s+(.+)/);
      if (pythonErrorLine) {
        const msg = pythonErrorLine[1];
        const sig = `ERROR: ${msg.slice(0, 50)}`;
        if (!seenErrors.has(sig)) {
          seenErrors.add(sig);
          flushError();
          currentError.push(`ERROR: ${msg}`);
        }
        inStackTrace = false;
        continue;
      }

      // Python stack frame
      const pythonFrameMatch = line.match(/^\s*File "([^"]+)", line (\d+), in (.+)/);
      if (pythonFrameMatch) {
        const [, filepath, lineNum, funcName] = pythonFrameMatch;
        inStackTrace = true;
        
        if (internalPatterns.some(p => p.test(filepath))) {
          continue;
        }
        
        if (stackFrameCount < 3) {
          const shortPath = filepath.replace(/.*site-packages\//, '').replace(/.*\/usr\/local\/lib\/.*\//, '');
          seenStackTraces.add(`${shortPath}:${lineNum}`);
          currentError.push(`  File "${shortPath}", line ${lineNum}, in ${funcName}`);
          stackFrameCount++;
        }
        continue;
      }

      // Python code context line
      if (inStackTrace && /^\s{4,}\S/.test(line) && !line.includes('File "')) {
        if (stackFrameCount <= 3 && currentError.length > 0) {
          currentError.push('    ' + line.trim());
        }
        continue;
      }

      // Java/Python Exception
      const exceptionMatch = line.match(/^(\s*)((?:[\w.]+\.)?(?:\w+Exception|\w+Error)):\s*(.+)/);
      if (exceptionMatch) {
        const [, indent, fullExType, message] = exceptionMatch;
        const exType = fullExType.split('.').pop() || fullExType;
        const errorSig = `${exType}: ${message.slice(0, 60)}`;
        
        if (!seenErrors.has(errorSig)) {
          seenErrors.add(errorSig);
          if (indent && indent.length > 2) {
            currentError.push(`${exType}: ${message}`);
          } else {
            flushError();
            currentError.push(`${exType}: ${message}`);
          }
        } else {
          flushError();
          inStackTrace = true;
          stackFrameCount = 999;
          continue;
        }
        inStackTrace = false;
        stackFrameCount = 0;
        continue;
      }
      
      // Spring Boot log with ERROR/WARN
      const springLogMatch = line.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+(ERROR|WARN)\s+\d+\s+---\s+\[[^\]]+\]\s+(\S+)\s*:\s*(.+)/);
      if (springLogMatch) {
        const [, level, logger, message] = springLogMatch;
        if (level === 'ERROR' || message.includes('Could not')) {
          flushError();
          currentError.push(`${level}: ${message}`);
          inStackTrace = false;
        }
        continue;
      }
      
      // JS errors
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
      
      // FAIL and ERROR in
      const buildErrorMatch = line.match(/^(FAIL|ERROR\s+in)[\s:]/i);
      if (buildErrorMatch) {
        flushError();
        currentError.push(line.trim());
        inStackTrace = false;
        continue;
      }
      
      // Stack trace (JS/Java at lines)
      if (/^\s*at\s+/.test(line)) {
        inStackTrace = true;
        if (internalPatterns.some(p => p.test(line))) continue;
        
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
      
      // Caused by with full exception
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
          flushError();
          inStackTrace = true;
          stackFrameCount = 999;
        }
        continue;
      }
      
      // Module not found
      if (/Module not found|Can't resolve/.test(line)) {
        flushError();
        currentError.push(line.trim());
        continue;
      }
      
      // Test suite
      if (/^\s*●\s+/.test(line)) {
        flushError();
        currentError.push(line.trim());
        continue;
      }
      
      // Webpack summary
      if (/webpack compiled with \d+ error/.test(line)) {
        flushError();
        sections.push(line.trim());
        continue;
      }
      
      // Skip resolution noise
      if (/Field 'browser'|Parsed request|using description file|resolve as module|single file module|doesn't exist|looking for modules|no extension|\.ts doesn't exist|\.tsx doesn't exist|\.js doesn't exist|\.json doesn't exist|is not a directory/.test(line)) {
        continue;
      }
      
      if (/^resolve ['"]/.test(line.trim())) {
        continue;
      }
      
      // AWS SDK errors
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
      
      // SQL context
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
      
      // Context lines
      if (currentError.length > 0 && !inStackTrace && currentError.length < 5) {
        const trimmed = line.trim();
        if (trimmed && trimmed.length > 5) {
          currentError.push(trimmed);
        }
      }
    }
    
    flushError();
    flushCodeContext();
    
    let result = sections.join('\n\n').trim();
    
    if (appFailedBlock.length > 0) {
      const filteredBlock = appFailedBlock.filter(line => !line.includes('APPLICATION FAILED TO START'));
      result += '\n\nAPPLICATION FAILED TO START\n' + filteredBlock.join('\n');
    }
    
    if (sections.length > 0 || appFailedBlock.length > 0) {
      result = 'Fix these errors:\n\n' + result;
    }
    
    return result || input;
  }
}

// =====================
// TEST CASE: Python/FastAPI Error Log
// =====================
const pythonInput = `INFO:     Will watch for changes in these directories: ['/app']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [17] using StatReload
INFO:     Started server process [19]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
2026-01-10 14:12:44,892 INFO sqlalchemy.engine.Engine BEGIN (implicit)
2026-01-10 14:12:44,893 INFO sqlalchemy.engine.Engine SELECT 1
2026-01-10 14:12:44,894 INFO sqlalchemy.engine.Engine COMMIT
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/default.py", line 951, in do_execute
    cursor.execute(statement, parameters)
psycopg2.OperationalError: connection to server at "postgres" (172.18.0.2), port 5432 failed: Connection refused
    Is the server running on that host and accepting TCP/IP connections?

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 143, in __init__
    self._dbapi_connection = engine.raw_connection()
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 3301, in raw_connection
    return self.pool.connect()
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/pool/base.py", line 447, in connect
    return _ConnectionFairy._checkout(self)
  File "/usr/local/lib/python3.11/site-packages/starlette/middleware/errors.py", line 184, in __call__
    raise exc
  File "/app/api/routes/users.py", line 54, in get_users
    users = db.query(User).limit(50).all()
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/query.py", line 2704, in all
    return self._iter().all()
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server at "postgres" (172.18.0.2), port 5432 failed: Connection refused
    Is the server running on that host and accepting TCP/IP connections?

[SQL: SELECT users.id AS users_id, users.email AS users_email, users.created_at AS users_created_at 
FROM users 
 LIMIT %(param_1)s]
[parameters: {'param_1': 50}]
(Background on this error at: https://sqlalche.me/e/20/e3q8)

ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/uvicorn/protocols/http/h11_impl.py", line 429, in run_asgi
    result = await app(
  File "/usr/local/lib/python3.11/site-packages/starlette/middleware/errors.py", line 184, in __call__
    raise exc
  File "/app/api/routes/users.py", line 54, in get_users
    users = db.query(User).limit(50).all()
  (repeated 3 times)

INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
ERROR:    Application shutdown failed. Exiting.`;

const optimizer = new LocalOptimizer();

console.log('=== PYTHON/FASTAPI ERROR LOG TEST ===\n');

const result = optimizer.optimize(pythonInput);

console.log('=== INPUT ===');
console.log(`Length: ${pythonInput.length} chars (~${optimizer.estimateTokens(pythonInput)} tokens)`);
console.log(`Is error log: ${optimizer.isErrorLog(pythonInput)}`);
console.log('\n=== OPTIMIZED OUTPUT ===');
console.log(result.optimized);
console.log('\n=== STATS ===');
console.log(`Original: ${result.originalTokens} tokens`);
console.log(`Optimized: ${result.optimizedTokens} tokens`);
console.log(`Savings: ${result.savings}%`);
