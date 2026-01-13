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
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

// Demo text for the optimization showcase
const originalPrompt = `Hey so I have this really annoying bug that I've been trying to fix for like hours now and I'm getting super frustrated. Basically what's happening is that when I click the submit button on my form it's supposed to send the data to my API endpoint but instead nothing happens at all and I checked the console and there's this weird error message that says "TypeError: Cannot read property 'data' of undefined" and I've tried console logging everything but I can't figure out where the undefined is coming from. Here's my code:

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

Can you help me fix this? I really need it to work because my deadline is tomorrow and my boss is going to be really mad if I don't get this done. Also I should mention that I'm using React and Next.js if that helps at all. Thanks so much in advance!`;

const optimizedPrompt = `**Bug**: Form submit → "TypeError: Cannot read property 'data' of undefined"

**Code**:
\`\`\`javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  const result = response.json(); // Missing await
  console.log(result.data);
}
\`\`\`

**Stack**: React, Next.js
**Need**: Fix undefined error on API response`;

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
  { value: '3x', label: 'Faster AI Responses' },
  { value: '$50+', label: 'Monthly Savings*' },
  { value: '10K+', label: 'Prompts Optimized' },
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
  
  useEffect(() => {
    const interval = setInterval(() => {
      setShowOptimized(prev => !prev);
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
            <span className="text-ink-400 text-sm font-mono">prompt.txt</span>
          </div>
          <div className="flex items-center gap-2">
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
              key={showOptimized ? 'optimized' : 'original'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
            >
              {showOptimized ? (
                <span className="text-trim-300">{optimizedPrompt}</span>
              ) : (
                <span className="text-ink-300">{originalPrompt}</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="px-6 py-4 border-t border-ink-700/50 bg-ink-900/50">
          <TokenCounter original={312} optimized={89} />
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
            Stop Wasting Tokens.
            <br />
            <span className="gradient-text">Start Trimming.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-ink-400 max-w-2xl mx-auto mb-10"
          >
            TokenTrim analyzes your prompts in real-time, removes fluff, and delivers
            concise queries that save money and get better AI responses.
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
            TokenTrim uses advanced parsing techniques to understand your intent
            and deliver the most efficient prompt possible.
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
      <div className="absolute inset-0 bg-grid opacity-30" />
      
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
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-trim-500/50 to-transparent" />
              )}
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
                  <span className="text-6xl font-display font-bold">$3.99</span>
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
            Ready to <span className="gradient-text">Trim</span> Your Tokens?
          </h2>
          <p className="text-xl text-ink-400 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are saving money and getting better AI results with TokenTrim.
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
            © 2025 TokenTrim. All rights reserved.
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
      <DemoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
















