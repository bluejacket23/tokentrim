'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, 
  Zap, 
  DollarSign, 
  Code2, 
  ArrowRight, 
  Check, 
  Sparkles,
  Target,
  Layers,
  Clock,
  TrendingDown,
  Brain,
  Copy,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

// Demo examples for the optimization showcase
const demoExamples = [
  {
    title: 'Verbose Bug Report',
    original: `Hey so I have this really annoying bug that I've been trying to fix for like hours now and I'm getting super frustrated. Basically what's happening is that when I click the submit button on my form it's supposed to send the data to my API endpoint but instead nothing happens at all and I checked the console and there's this weird error message that says "TypeError: Cannot read property 'data' of undefined" and I've tried console logging everything but I can't figure out where the undefined is coming from. Here's my code:

\`\`\`javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  const result = response.json();
  console.log(result.data);
}
\`\`\`

Can you help me fix this? I really need it to work because my deadline is tomorrow and my boss is going to be really mad if I don't get this done. Also I should mention that I'm using React and Next.js if that helps at all. Thanks so much in advance!`,
    optimized: `[react, nextjs]
Bug: Form submit → "TypeError: Cannot read property 'data' of undefined"

\`\`\`javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  const result = response.json();
  console.log(result.data);
}
\`\`\`

→ Fix only, no explanations`,
    originalTokens: 312,
    optimizedTokens: 95,
  },
  {
    title: 'Wordy Feature Request',
    original: `Alright so I want to build a feature for a user login screen. The system should use Google OAuth for authentication because that's what all the cool apps are doing these days and it's more secure than having users create yet another password they'll forget. I would like it to be stored in DynamoDB because we're already using AWS for everything else and it makes sense to keep it all in one ecosystem. There should only ever be 1 email tied to an account so we don't have duplicate users causing problems. It should be futuristic, clean, dark, looking... basically like a modern startup vibe you know? Oh and I'm using React and TypeScript for the frontend if that helps at all. Thanks!`,
    optimized: `[react, typescript, dynamodb, oauth, aws]
Build: login screen
Use: Google OAuth
Store: DynamoDB
Constraint: unique email per account
UI: futuristic, clean, dark

→ Code only`,
    originalTokens: 178,
    optimizedTokens: 52,
  },
  {
    title: 'Spring Boot Stack Trace',
    original: `2026-01-10 14:23:45.123 INFO 12345 --- [main] c.example.MyApplication : Starting MyApplication v1.0.0
2026-01-10 14:23:47.456 INFO 12345 --- [main] o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port(s): 8080
2026-01-10 14:23:52.789 ERROR 12345 --- [http-nio-8080-exec-1] o.a.c.c.C.[.[.[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] threw exception

org.springframework.dao.DataIntegrityViolationException: could not execute statement; SQL [n/a]; constraint [users_email_key]
    at org.springframework.orm.jpa.vendor.HibernateJpaDialect.convertHibernateAccessException(HibernateJpaDialect.java:276)
    at org.springframework.orm.jpa.vendor.HibernateJpaDialect.translateExceptionIfPossible(HibernateJpaDialect.java:233)
    at org.springframework.orm.jpa.AbstractEntityManagerFactoryBean.translateExceptionIfPossible(AbstractEntityManagerFactoryBean.java:551)
    at org.springframework.dao.support.ChainedPersistenceExceptionTranslator.translateExceptionIfPossible(ChainedPersistenceExceptionTranslator.java:61)
    at org.springframework.dao.support.DataAccessUtils.translateIfNecessary(DataAccessUtils.java:242)
    at org.springframework.dao.support.PersistenceExceptionTranslationInterceptor.invoke(PersistenceExceptionTranslationInterceptor.java:152)
    at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)
    at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:763)
    at org.springframework.transaction.interceptor.TransactionInterceptor$1.proceedWithInvocation(TransactionInterceptor.java:123)
    at org.springframework.transaction.interceptor.TransactionAspectSupport.invokeWithinTransaction(TransactionAspectSupport.java:388)
Caused by: org.hibernate.exception.ConstraintViolationException: could not execute statement
    at org.hibernate.exception.internal.SQLExceptionTypeDelegate.convert(SQLExceptionTypeDelegate.java:59)
    at org.hibernate.exception.internal.StandardSQLExceptionConverter.convert(StandardSQLExceptionConverter.java:37)
    at org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:113)
    ... 45 common frames omitted
Caused by: org.postgresql.util.PSQLException: ERROR: duplicate key value violates unique constraint "users_email_key"
  Detail: Key (email)=(test@example.com) already exists.
    at org.postgresql.core.v3.QueryExecutorImpl.receiveErrorResponse(QueryExecutorImpl.java:2676)
    at org.postgresql.core.v3.QueryExecutorImpl.processResults(QueryExecutorImpl.java:2366)
    ... 58 common frames omitted`,
    optimized: `Fix these errors:

DataIntegrityViolationException: could not execute statement; SQL [n/a]; constraint [users_email_key]

Caused by: ConstraintViolationException: could not execute statement

Caused by: PSQLException: ERROR: duplicate key value violates unique constraint "users_email_key"
  Detail: Key (email)=(test@example.com) already exists.

→ Fix only, no explanations`,
    originalTokens: 487,
    optimizedTokens: 68,
  },
  {
    title: 'Jest Test Failure',
    original: `> myapp@1.0.0 test
> jest --coverage

FAIL src/components/UserList.test.tsx
  ● UserList › should render users

    TypeError: Cannot read property 'map' of undefined

      14 |   return (
      15 |     <ul>
    > 16 |       {users.map(user => (
         |              ^
      17 |         <li key={user.id}>{user.name}</li>
      18 |       ))}
      19 |     </ul>

      at UserList (src/components/UserList.tsx:16:14)
      at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)
      at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:17811:13)
      at beginWork (node_modules/react-dom/cjs/react-dom.development.js:19049:16)
      at HTMLUnknownElement.callCallback (node_modules/react-dom/cjs/react-dom.development.js:3945:14)
      at Object.invokeGuardedCallbackDev (node_modules/react-dom/cjs/react-dom.development.js:3994:16)
      at invokeGuardedCallback (node_modules/react-dom/cjs/react-dom.development.js:4056:31)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        3.456 s`,
    optimized: `Fix these errors:

● UserList › should render users
TypeError: Cannot read property 'map' of undefined
  at UserList (src/components/UserList.tsx:16:14)

14 |   return (
15 |     <ul>
> 16 |       {users.map(user => (
         |              ^
17 |         <li key={user.id}>{user.name}</li>

→ Fix only, no explanations`,
    originalTokens: 298,
    optimizedTokens: 78,
  },
];

const features = [
  {
    icon: Scissors,
    title: 'Fluff Removal',
    description: 'Eliminates filler words, redundant phrases, and unnecessary context that bloats your prompts.',
  },
  {
    icon: Layers,
    title: 'Smart Deduplication',
    description: 'Detects and merges repeated code blocks, error messages, and information.',
  },
  {
    icon: Target,
    title: 'Constraint Extraction',
    description: 'Identifies and highlights key requirements, making them crystal clear for the AI.',
  },
  {
    icon: Brain,
    title: 'Intent Detection',
    description: 'Understands what you\'re really asking and restructures the prompt accordingly.',
  },
  {
    icon: Code2,
    title: 'Code Preservation',
    description: 'Keeps all important code intact while trimming the surrounding noise.',
  },
  {
    icon: Zap,
    title: 'Real-time Processing',
    description: 'See your optimized prompt update live as you type in the VS Code extension.',
  },
];

const stats = [
  { value: '60%', label: 'Average Token Reduction' },
  { value: '3x', label: 'Better Response Quality' },
  { value: '$50+', label: 'Monthly Savings*' },
  { value: '20-40%', label: 'Context = Quality Drop' },
];

function TokenCounter({ original, optimized }: { original: number; optimized: number }) {
  const savings = Math.round((1 - optimized / original) * 100);
  
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-ink-400">Original:</span>
        <span className="font-mono text-red-400">{original} tokens</span>
      </div>
      <ArrowRight className="w-4 h-4 text-trim-500" />
      <div className="flex items-center gap-2">
        <span className="text-ink-400">Optimized:</span>
        <span className="font-mono text-trim-400">{optimized} tokens</span>
      </div>
      <div className="px-3 py-1 bg-trim-500/20 border border-trim-500/30 rounded-full">
        <span className="text-trim-400 font-semibold">-{savings}%</span>
      </div>
    </div>
  );
}

function ComparisonDemo() {
  const [showOptimized, setShowOptimized] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  
  const currentExample = demoExamples[exampleIndex];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setShowOptimized(prev => {
        // When going from optimized back to original, switch examples
        if (prev) {
          setExampleIndex(i => (i + 1) % demoExamples.length);
        }
        return !prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-trim-500/20 via-trim-400/10 to-trim-500/20 rounded-2xl blur-xl" />
      <div className="relative glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700/50">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-ink-400 text-sm font-mono">{currentExample.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Example selector dots */}
            <div className="flex gap-1 mr-3">
              {demoExamples.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setExampleIndex(i); setShowOptimized(false); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === exampleIndex ? 'bg-trim-400' : 'bg-ink-600 hover:bg-ink-500'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setShowOptimized(false)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                !showOptimized 
                  ? 'bg-ink-700 text-ink-100' 
                  : 'text-ink-400 hover:text-ink-300'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setShowOptimized(true)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                showOptimized 
                  ? 'bg-trim-500/20 text-trim-400 border border-trim-500/30' 
                  : 'text-ink-400 hover:text-ink-300'
              }`}
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Optimized
              </span>
            </button>
          </div>
        </div>
        
        <div className="p-6 min-h-[300px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${exampleIndex}-${showOptimized ? 'optimized' : 'original'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
            >
              {showOptimized ? (
                <span className="text-trim-300">{currentExample.optimized}</span>
              ) : (
                <span className="text-ink-300">{currentExample.original}</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="px-6 py-4 border-t border-ink-700/50 bg-ink-900/50">
          <TokenCounter original={currentExample.originalTokens} optimized={currentExample.optimizedTokens} />
        </div>
      </div>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass py-4' : 'py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-trim-500 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-ink-950" />
          </div>
          <span className="text-xl font-display font-bold">TokenTrim</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-ink-400 hover:text-ink-100 transition-colors">Features</a>
          <a href="#demo" className="text-ink-400 hover:text-ink-100 transition-colors">Demo</a>
          <a href="#pricing" className="text-ink-400 hover:text-ink-100 transition-colors">Pricing</a>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-ink-300 hover:text-ink-100 transition-colors">
            Sign In
          </Link>
          <Link href="/auth/login" className="btn-primary flex items-center gap-2">
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-grid opacity-50" />
      
      {/* Floating elements */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-trim-500/5 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-trim-400/5 rounded-full blur-3xl"
      />
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-trim-500/10 border border-trim-500/20 text-trim-400 text-sm mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Introducing TokenTrim for VS Code & Cursor</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight"
          >
            Clean Input.
            <br />
            <span className="gradient-text">Clean Output.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-ink-400 max-w-2xl mx-auto mb-10"
          >
            LLMs only perform as well as your prompts. TokenTrim strips the noise, 
            keeps the signal, and helps you get precise responses from Claude, GPT, and more.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/login" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#demo" className="btn-secondary flex items-center gap-2 text-lg px-8 py-4">
              See It In Action
              <ChevronDown className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
        
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-6 glass rounded-2xl">
              <div className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">
                {stat.value}
              </div>
              <div className="text-ink-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section id="demo" className="py-24 relative">
      <div className="absolute inset-0 bg-radial-gradient" />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            See the <span className="gradient-text">Difference</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-ink-400 max-w-2xl mx-auto"
          >
            Watch how TokenTrim transforms a rambling prompt into a precise, 
            token-efficient query that gets better results.
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <ComparisonDemo />
        </motion.div>
      </div>
    </section>
  );
}

function WhyItMattersSection() {
  const insights = [
    {
      icon: AlertTriangle,
      title: 'Context Windows Degrade Early',
      description: 'LLMs start losing quality at 20-40% context usage—not 100%. Every bloated prompt pushes you closer to that cliff.',
      highlight: '20-40%',
      highlightLabel: 'where degradation begins',
    },
    {
      icon: RefreshCw,
      title: 'Bad Input = Bad Output',
      description: 'If your output sucks, your input sucked. The bottleneck is almost always on the human side—how you structure prompts and provide context.',
      highlight: '100%',
      highlightLabel: 'correlation',
    },
    {
      icon: MessageSquare,
      title: 'Prompts Are Everything',
      description: 'Specific beats vague. Every. Single. Time. "Build auth" gives Claude creative freedom it will use poorly. Precise prompts get precise results.',
      highlight: '3x',
      highlightLabel: 'better responses',
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>The Hard Truth About LLMs</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            Your Prompts Are <span className="text-red-400">Probably Too Long</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-ink-400 max-w-3xl mx-auto"
          >
            Claude Opus 4.5 has a 200K token context window. But here's what most people 
            don't realize: the model starts to deteriorate way before you hit 100%.
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-trim-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative card card-hover h-full">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:scale-110 transition-transform">
                  <insight.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">
                  {insight.title}
                </h3>
                <p className="text-ink-400 mb-4">
                  {insight.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-2xl font-display font-bold text-trim-400">{insight.highlight}</span>
                  <span className="text-ink-500">{insight.highlightLabel}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-block glass rounded-2xl p-6 max-w-2xl">
            <p className="text-ink-300 italic text-lg">
              "Remember: <span className="text-trim-400 font-semibold">output is everything</span>, but it only comes from input. 
              If you're getting bad results, the fix isn't switching models. 
              The fix is getting better at how you write prompts."
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            Intelligent <span className="gradient-text">Optimization</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-ink-400 max-w-2xl mx-auto"
          >
            TokenTrim helps you write prompts like an expert—specific, constrained, 
            and clear. No more "creative freedom" gone wrong.
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card card-hover group"
            >
              <div className="feature-icon mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-ink-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Install the Extension',
      description: 'Download TokenTrim from the VS Code marketplace and enter your API key.',
      icon: Code2,
    },
    {
      number: '02',
      title: 'Type Your Prompt',
      description: 'Write your prompt naturally in the TokenTrim panel. No special syntax needed.',
      icon: Sparkles,
    },
    {
      number: '03',
      title: 'Watch It Optimize',
      description: 'See your prompt transform in real-time with token counts updating live.',
      icon: Zap,
    },
    {
      number: '04',
      title: 'Copy & Use',
      description: 'One click to copy the optimized prompt to your clipboard or directly to chat.',
      icon: Copy,
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            How It <span className="gradient-text">Works</span>
          </motion.h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-6xl font-display font-bold text-trim-500/20 mb-4">
                {step.number}
              </div>
              <div className="feature-icon mb-4">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">
                {step.title}
              </h3>
              <p className="text-ink-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const benefits = [
    'Unlimited prompt optimizations',
    'VS Code & Cursor extension',
    'Real-time token counting',
    'All optimization features',
    'Priority support',
    'Cancel anytime',
  ];

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-radial-gradient" />
      
      <div className="relative max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            Simple <span className="gradient-text">Pricing</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-ink-400 max-w-2xl mx-auto"
          >
            One plan, all features. Save more on tokens than you spend on TokenTrim.
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-trim-500/30 via-trim-400/20 to-trim-500/30 rounded-3xl blur-xl" />
          <div className="relative pricing-card glass rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-6xl font-display font-bold">$2.99</span>
                  <span className="text-ink-400">/month</span>
                </div>
                <p className="text-ink-400 mb-6">
                  Less than a coffee. Saves you $50+ in tokens monthly.*
                </p>
                <ul className="space-y-3">
                  {benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-trim-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-trim-400" />
                      </div>
                      <span className="text-ink-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <Link
                  href="/auth/login"
                  className="btn-primary text-lg px-12 py-4 flex items-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="text-ink-500 text-sm">7-day free trial • No credit card required</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <p className="text-center text-ink-500 text-sm mt-8">
          *Based on average usage of 1000+ prompts/month with 60% token reduction at $0.002/1K tokens
        </p>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass rounded-3xl p-12 md:p-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Better Prompts. <span className="gradient-text">Better Results.</span>
          </h2>
          <p className="text-xl text-ink-400 mb-8 max-w-2xl mx-auto">
            Stop blaming the model. Start writing prompts that actually work. 
            TokenTrim helps you communicate with AI the way it's meant to be—clear, specific, and efficient.
          </p>
          <Link
            href="/auth/login"
            className="btn-primary text-lg px-12 py-4 inline-flex items-center gap-2"
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-ink-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-trim-500 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-ink-950" />
            </div>
            <span className="font-display font-bold">TokenTrim</span>
          </div>
          
          <div className="flex items-center gap-6 text-ink-400 text-sm">
            <a href="#" className="hover:text-ink-100 transition-colors">Privacy</a>
            <a href="#" className="hover:text-ink-100 transition-colors">Terms</a>
            <a href="#" className="hover:text-ink-100 transition-colors">Support</a>
          </div>
          
          <p className="text-ink-500 text-sm">
            © 2026 TokenTrim. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <WhyItMattersSection />
      <DemoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}

















