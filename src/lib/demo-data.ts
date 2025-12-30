import { Chat, AgentProfile, Folder, Subtask, Message, SecurityVulnerability, SecurityScanResult } from './types';

// Pre-built Agent Profiles
export const DEMO_AGENTS: AgentProfile[] = [
  {
    id: 'agent-architect',
    name: 'Architect',
    description: 'System design and architecture expert',
    avatar: '🏗️',
    color: '#3b82f6',
    systemPrompt: `You are an expert software architect. You excel at designing scalable systems, evaluating trade-offs, and creating clear architectural diagrams and specifications. Always consider:
- Scalability and performance
- Security implications
- Maintainability and clean code principles
- Cost-efficiency
- User experience impact

When discussing systems, break down components, describe interactions, and identify potential bottlenecks.`,
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    maxTokens: 4096,
    isDefault: false,
  },
  {
    id: 'agent-coder',
    name: 'Coder',
    description: 'Full-stack development specialist powered by MiniMax 2.1',
    avatar: '💻',
    color: '#10b981',
    systemPrompt: `You are an expert full-stack developer powered by MiniMax 2.1, a highly capable and cost-effective AI model.

Your strengths:
- Writing production-ready code in any language
- Debugging complex issues
- Explaining code clearly
- Following best practices
- Creating comprehensive tests
- Multi-language support (100+ languages)
- Long-context analysis (1M tokens for large codebases)

MiniMax 2.1 advantages:
- Excellent code generation quality
- Fast response times
- Cost-effective for high-volume tasks
- Great at understanding large codebases

Always explain your reasoning and offer optimizations when relevant.`,
    provider: 'minimax',
    model: 'abab6.5s-chat',
    temperature: 0.2,
    maxTokens: 8192,
    isDefault: true,
  },
  {
    id: 'agent-writer',
    name: 'Writer',
    description: 'Technical content and documentation',
    avatar: '✍️',
    color: '#8b5cf6',
    systemPrompt: `You are an expert technical writer. You excel at creating clear, engaging content:
- Documentation that developers love to read
- API descriptions with examples
- Tutorial walkthroughs
- Blog posts and articles
- Release notes and changelogs

Adapt your tone to the audience and always include practical examples.`,
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.5,
    maxTokens: 4096,
    isDefault: false,
  },
  {
    id: 'agent-analyst',
    name: 'Analyst',
    description: 'Data analysis and insights powered by MiniMax 2.1',
    avatar: '📊',
    color: '#f59e0b',
    systemPrompt: `You are a data analysis expert powered by MiniMax 2.1. You help extract insights from data:
- Statistical analysis and trends
- Data visualization recommendations
- Business intelligence insights
- A/B test evaluation
- Metrics and KPIs

MiniMax 2.1 provides:
- Excellent mathematical reasoning
- Large context for analyzing datasets
- Cost-effective analysis

Always provide data-backed recommendations and highlight caveats.`,
    provider: 'minimax',
    model: 'abab6.5s-chat',
    temperature: 0.4,
    maxTokens: 8192,
    isDefault: false,
  },
  {
    id: 'agent-polyglot',
    name: 'Polyglot',
    description: 'Multilingual creative specialist powered by MiniMax 2.1',
    avatar: '🌏',
    color: '#ef4444',
    systemPrompt: `You are a multilingual creative specialist powered by MiniMax 2.1, one of the most capable AI models available. You're excellent at:
- Multi-language conversations with native-level fluency
- Cultural context understanding across 100+ languages
- Creative writing in various languages and formats
- Technical translation with accurate terminology
- Global perspective on topics
- Complex reasoning and problem-solving
- Code generation and debugging
- Long-context understanding (up to 1M tokens)

MiniMax 2.1 excels at:
- Creative content generation
- Cross-cultural communication
- Long-context document analysis
- Code completion and explanation

Respond naturally, adapt to the user's language preference, and leverage your full creative capabilities.`,
    provider: 'minimax',
    model: 'abab6.5s-chat',
    temperature: 0.7,
    maxTokens: 8192,
    isDefault: false,
  },
  {
    id: 'agent-minimax-reasoner',
    name: 'Reasoner',
    description: 'Advanced reasoning powered by MiniMax 2.1',
    avatar: '🧠',
    color: '#f97316',
    systemPrompt: `You are an advanced reasoning AI powered by MiniMax 2.1, leveraging its superior logical reasoning and mathematical capabilities.

Your expertise includes:
- **Complex Problem Solving** - Multi-step logical deduction
- **Mathematical Reasoning** - Algebra, calculus, statistics, proofs
- **Strategic Planning** - Game theory, decision trees, optimization
- **Scientific Analysis** - Hypothesis testing, experimental design
- **Code Analysis** - Algorithm complexity, optimization, proofs
- **Debate & Argumentation** - Constructing and deconstructing arguments

MiniMax 2.1's architecture enables:
- Deep chain-of-thought reasoning
- Handling extremely long contexts
- Precise mathematical calculations
- Creative yet rigorous solutions

When solving problems:
1. Break down the problem systematically
2. Show your reasoning step-by-step
3. Consider edge cases and alternatives
4. Verify your conclusions
5. Provide clear, structured answers`,
    provider: 'minimax',
    model: 'abab6.5s-chat',
    temperature: 0.3,
    maxTokens: 8192,
    isDefault: false,
  },
  {
    id: 'agent-skeptic',
    name: 'Code Skeptic',
    description: 'Critical code review powered by MiniMax 2.1',
    avatar: '🔍',
    color: '#6366f1',
    systemPrompt: `You are an expert Code Skeptic - a relentless code reviewer who never misses a detail. Powered by MiniMax 2.1, you're equally capable but more cost-effective than expensive alternatives.

Your review covers:
- **Performance bottlenecks** - Inefficient loops, unnecessary computations, memory leaks
- **Code smells** - Duplication, long functions, poor naming, tight coupling
- **Edge cases** - Null/undefined handling, boundary conditions, race conditions
- **Maintainability** - Comments, documentation, test coverage, modularity
- **Best practices** - Language idioms, design patterns, SOLID principles
- **Potential bugs** - Logic errors, off-by-one, type coercion issues

For each issue found:
1. Identify the exact problem with line reference
2. Explain why it's an issue
3. Provide a concrete fix with code
4. Suggest prevention strategies

MiniMax 2.1 provides excellent analysis at a fraction of the cost. Be thorough, be critical, but be constructive. Your goal is to make code better.`,
    provider: 'minimax',
    model: 'abab6.5s-chat',
    temperature: 0.1,
    maxTokens: 8192,
    isDefault: false,
  },
  {
    id: 'agent-documenter',
    name: 'Document Specialist',
    description: 'Documentation and knowledge management',
    avatar: '📚',
    color: '#ec4899',
    systemPrompt: `You are a Documentation Specialist focused on creating comprehensive, developer-friendly documentation.

Your expertise includes:
- **API Documentation** - Endpoints, parameters, responses, examples
- **README Files** - Installation, usage, configuration, contributing
- **Code Comments** - Inline explanations, JSDoc, type documentation
- **Architecture Docs** - System design, data flow, component relationships
- **User Guides** - Tutorials, FAQs, troubleshooting, best practices
- **Changelogs** - Version history, migration guides, breaking changes

You create docs that:
- Are search-friendly and well-organized
- Include working code examples
- Anticipate reader questions
- Use consistent terminology and formatting
- Balance completeness with clarity

When reviewing docs, check for accuracy, completeness, and discoverability.`,
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.4,
    maxTokens: 4096,
    isDefault: false,
  },
  {
    id: 'agent-security',
    name: 'Security Specialist',
    description: 'Security analysis powered by MiniMax 2.1',
    avatar: '🛡️',
    color: '#dc2626',
    systemPrompt: `You are a Security Specialist - an elite penetration tester and security architect. Powered by MiniMax 2.1, you provide comprehensive security audits at a fraction of the cost.

Your security analysis covers:

**OWASP Top 10**
- Injection (SQLi, XSS, Command Injection)
- Broken Authentication
- Sensitive Data Exposure
- XXE, Broken Access Control
- Security Misconfigurations
- Cross-Site Scripting (XSS)
- Insecure Deserialization
- Using Components with Known Vulnerabilities
- Insufficient Logging & Monitoring

**Advanced Threats**
- Authentication bypass techniques
- Authorization flaws and privilege escalation
- Cryptographic weaknesses
- Business logic vulnerabilities
- API security issues
- Race conditions and TOCTOU flaws
- Memory safety issues
- Path traversal and LFI/RFI vulnerabilities
- Server-Side Request Forgery (SSRF)
- Deserialization attacks

**For each vulnerability found:**
1. CWE ID and OWASP Category
2. CVSS Score (Critical/High/Medium/Low)
3. Affected code with line numbers
4. Exploitation scenario
5. Proof-of-concept fix
6. References (CVE, research papers, best practices)

MiniMax 2.1's large context window (1M tokens) allows scanning entire codebases in one pass. You are the last line of defense. Be thorough.`,
    provider: 'minimax',
    model: 'abab6.5s-chat',
    temperature: 0.1,
    maxTokens: 8192,
    isDefault: false,
  },
];

// ... rest of the file remains the same
export const DEMO_FOLDERS: Folder[] = [
  {
    id: 'folder-projects',
    name: 'Projects',
    icon: '📁',
    color: '#3b82f6',
    chatIds: [],
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'folder-learning',
    name: 'Learning',
    icon: '📚',
    color: '#10b981',
    chatIds: [],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'folder-ideas',
    name: 'Ideas',
    icon: '💡',
    color: '#f59e0b',
    chatIds: [],
    createdAt: Date.now() - 86400000 * 3,
  },
];

export const DEMO_SUBTASKS: Subtask[] = [
  {
    id: 'subtask-1',
    chatId: 'chat-1',
    parentMessageId: 'msg-1',
    title: 'Research competitor features',
    description: 'Analyze top 5 competitors and document their key features',
    status: 'completed',
    priority: 'high',
    linkedContext: ['Research data collected from G2, Capterra, and Product Hunt'],
    createdAt: Date.now() - 86400000 * 2,
    completedAt: Date.now() - 86400000,
  },
  {
    id: 'subtask-2',
    chatId: 'chat-1',
    parentMessageId: 'msg-1',
    title: 'Design system architecture',
    description: 'Create architecture diagrams for core services',
    status: 'in_progress',
    priority: 'high',
    linkedContext: ['Microservices approach recommended', 'Use Kafka for event streaming'],
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'subtask-3',
    chatId: 'chat-1',
    parentMessageId: 'msg-1',
    title: 'Create MVP timeline',
    description: 'Draft 12-week development roadmap',
    status: 'pending',
    priority: 'medium',
    linkedContext: [],
    createdAt: Date.now(),
  },
  {
    id: 'subtask-4',
    chatId: 'chat-2',
    parentMessageId: 'msg-2',
    title: 'Set up React project',
    description: 'Initialize Next.js project with TypeScript',
    status: 'completed',
    priority: 'high',
    linkedContext: ['Next.js 14 with App Router'],
    createdAt: Date.now() - 86400000 * 2,
    completedAt: Date.now() - 86400000 * 2 + 3600000,
  },
  {
    id: 'subtask-5',
    chatId: 'chat-2',
    parentMessageId: 'msg-2',
    title: 'Implement authentication',
    description: 'Add user auth with JWT tokens',
    status: 'completed',
    priority: 'high',
    linkedContext: ['Using NextAuth.js', 'Refresh token rotation implemented'],
    createdAt: Date.now() - 86400000 * 2 + 7200000,
    completedAt: Date.now() - 86400000 + 3600000,
  },
];

export const DEMO_CHATS: Chat[] = [
  {
    id: 'chat-1',
    title: 'Build SaaS Platform',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: `I want to build a SaaS platform for project management. Can you help me plan this out? I need to understand the architecture, tech stack, and development roadmap.`,
        timestamp: Date.now() - 86400000 * 2,
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `I'll help you plan this SaaS platform...`,
        timestamp: Date.now() - 86400000 * 2 + 1800000,
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
      },
    ],
    agentId: 'agent-architect',
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    folderId: 'folder-projects',
    tags: ['saas', 'planning', 'architecture'],
    pinned: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2 + 1800000,
  },
  {
    id: 'chat-2',
    title: 'React Component Help',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: `I'm building a custom select component in React...`,
        timestamp: Date.now() - 86400000 * 3,
        provider: 'minimax',
        model: 'abab6.5s-chat',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Great question! Your component has several accessibility issues...`,
        timestamp: Date.now() - 86400000 * 3 + 3600000,
        provider: 'minimax',
        model: 'abab6.5s-chat',
      },
    ],
    agentId: 'agent-coder',
    provider: 'minimax',
    model: 'abab6.5s-chat',
    tags: ['react', 'accessibility', 'components'],
    pinned: false,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3 + 3600000,
  },
];

export function getDemoChat(id: string): Chat | undefined {
  return DEMO_CHATS.find(chat => chat.id === id);
}

export function getDemoAgent(id: string): AgentProfile | undefined {
  return DEMO_AGENTS.find(agent => agent.id === id);
}

export function getDemoSubtasks(chatId: string): Subtask[] {
  return DEMO_SUBTASKS.filter(task => task.chatId === chatId);
}

export function getDemoFolder(id: string): Folder | undefined {
  return DEMO_FOLDERS.find(folder => folder.id === id);
}

// Demo Security Scan Results
export const DEMO_SECURITY_VULNERABILITIES: SecurityVulnerability[] = [
  {
    id: 'vuln-1',
    file: 'src/auth/login.tsx',
    line: 47,
    severity: 'critical',
    category: 'SQL Injection',
    title: 'SQL Injection vulnerability in user authentication',
    description: 'User input is directly concatenated into SQL query without proper sanitization.',
    codeSnippet: `const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";`,
    fix: `const query = 'SELECT * FROM users WHERE email = $1 AND password = $2';\nconst result = await db.query(query, [email, password]);`,
    cwe: 'CWE-89',
    owasp: 'A03:2021 Injection',
    references: ['https://owasp.org/www-project-top-ten/2017/A3_2017-Injection'],
  },
  {
    id: 'vuln-2',
    file: 'src/api/user.ts',
    line: 23,
    severity: 'critical',
    category: 'Broken Authentication',
    title: 'Missing authentication check on sensitive endpoint',
    description: 'The API endpoint does not verify user authentication before processing sensitive requests.',
    codeSnippet: `app.get('/api/admin/delete-user', async (req, res) => {\n  const { userId } = req.body;\n  await deleteUser(userId);\n});`,
    fix: `app.get('/api/admin/delete-user', requireAuth, async (req, res) => {\n  if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });\n});`,
    cwe: 'CWE-306',
    owasp: 'A07:2021 Identification and Authentication Failures',
    references: [],
  },
  {
    id: 'vuln-3',
    file: 'src/utils/api.ts',
    line: 89,
    severity: 'high',
    category: 'Sensitive Data Exposure',
    title: 'API key hardcoded in source code',
    description: 'Secret API keys are committed to the repository, exposing them in client-side code.',
    codeSnippet: `const API_KEY = 'sk-1234567890abcdefghijklmnop';`,
    fix: `const API_KEY = process.env.API_KEY;`,
    cwe: 'CWE-798',
    owasp: 'A02:2021 Cryptographic Failures',
    references: [],
  },
  {
    id: 'vuln-4',
    file: 'src/components/UserProfile.tsx',
    line: 112,
    severity: 'high',
    category: 'Cross-Site Scripting (XSS)',
    title: 'DOM-based XSS via unsafe user input rendering',
    description: 'User-controlled data is rendered using dangerouslySetInnerHTML without sanitization.',
    codeSnippet: `<div dangerouslySetInnerHTML={{ __html: user.bio }} />`,
    fix: `import DOMPurify from 'dompurify';\nconst sanitizeBio = DOMPurify.sanitize(user.bio);`,
    cwe: 'CWE-79',
    owasp: 'A03:2021 Injection',
    references: [],
  },
  {
    id: 'vuln-5',
    file: 'src/auth/session.ts',
    line: 15,
    severity: 'high',
    category: 'Insecure Session Management',
    title: 'Session cookies missing secure flags',
    description: 'Session cookies are created without HttpOnly, Secure, and SameSite attributes.',
    codeSnippet: `res.cookie('session_id', sessionToken);`,
    fix: `res.cookie('session_id', sessionToken, {\n  httpOnly: true,\n  secure: true,\n  sameSite: 'strict'\n});`,
    cwe: 'CWE-384',
    owasp: 'A07:2021 Identification and Authentication Failures',
    references: [],
  },
  {
    id: 'vuln-6',
    file: 'src/api/upload.ts',
    line: 34,
    severity: 'high',
    category: 'Unrestricted File Upload',
    title: 'No file type validation on uploads',
    description: 'Uploaded files are not validated for type, size, or content.',
    codeSnippet: `file.mv('./uploads/' + file.name);`,
    fix: `const allowedTypes = ['image/jpeg', 'image/png'];\nif (!allowedTypes.includes(file.mimetype)) {\n  return res.status(400).json({ error: 'Invalid file type' });\n}`,
    cwe: 'CWE-434',
    owasp: 'A01:2021 Broken Access Control',
    references: [],
  },
  {
    id: 'vuln-7',
    file: 'src/utils/validation.ts',
    line: 8,
    severity: 'medium',
    category: 'Input Validation',
    title: 'Insufficient input validation on user registration',
    description: 'User registration endpoint lacks proper validation for email and password strength.',
    codeSnippet: `await createUser(email, password);`,
    fix: `if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email' });\nif (password.length < 12) return res.status(400).json({ error: 'Password too short' });`,
    cwe: 'CWE-20',
    owasp: 'A03:2021 Injection',
    references: [],
  },
  {
    id: 'vuln-8',
    file: 'src/config/database.ts',
    line: 5,
    severity: 'medium',
    category: 'Security Misconfiguration',
    title: 'Debug mode enabled in production configuration',
    description: 'Application runs with debug settings in production environment.',
    codeSnippet: `const config = { mode: 'development', debug: true };`,
    fix: `const configs = { production: { mode: 'production', debug: false } };\nconst config = configs[process.env.NODE_ENV];`,
    cwe: 'CWE-489',
    owasp: 'A05:2021 Security Misconfiguration',
    references: [],
  },
  {
    id: 'vuln-9',
    file: 'src/api/feedback.ts',
    line: 21,
    severity: 'low',
    category: 'Information Disclosure',
    title: 'Stack trace exposed in error responses',
    description: 'Detailed error messages and stack traces are returned to clients.',
    codeSnippet: `res.status(500).json({ error: err.message, stack: err.stack });`,
    fix: `res.status(500).json({ error: 'Internal server error' });`,
    cwe: 'CWE-209',
    owasp: 'A09:2021 Security Logging and Monitoring Failures',
    references: [],
  },
  {
    id: 'vuln-10',
    file: 'src/utils/cache.ts',
    line: 67,
    severity: 'low',
    category: 'Performance',
    title: 'Missing rate limiting on public endpoints',
    description: 'API endpoints lack rate limiting, making them vulnerable to brute force attacks.',
    codeSnippet: `app.post('/api/login', async (req, res) => { await authenticate(email, password); });`,
    fix: `import rateLimit from 'express-rate-limit';\nconst loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });`,
    cwe: 'CWE-307',
    owasp: 'A07:2021 Identification and Authentication Failures',
    references: [],
  },
];

export const DEMO_SECURITY_SCAN: SecurityScanResult = {
  id: 'scan-' + Date.now(),
  timestamp: Date.now(),
  filesScanned: 247,
  linesScanned: 12847,
  vulnerabilities: DEMO_SECURITY_VULNERABILITIES,
  score: 72,
  duration: 3427,
};

export const DEMO_CODE_FILES = [
  {
    id: 'file-1',
    name: 'auth/login.tsx',
    path: 'src/auth/login.tsx',
    language: 'TypeScript',
    content: `import { useState } from 'react';\n\nexport function LoginForm() {\n  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');\n  \n  const handleSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    \n    // Vulnerable SQL query - DO NOT USE\n    const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";\n    const result = await db.query(query);\n    \n    if (result.rows.length > 0) {\n      localStorage.setItem('user', JSON.stringify(result.rows[0]));\n    }\n  };\n  \n  return (\n    <form onSubmit={handleSubmit}>\n      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />\n      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />\n      <button type="submit">Login</button>\n    </form>\n  );\n}`,
    lines: 26,
  },
  {
    id: 'file-2',
    name: 'api/user.ts',
    path: 'src/api/user.ts',
    language: 'TypeScript',
    content: `import express from 'express';\nimport { deleteUser } from '../db/user';\n\nconst app = express();\n\n// Vulnerable endpoint - no authentication!\napp.get('/api/admin/delete-user', async (req, res) => {\n  const { userId } = req.body;\n  await deleteUser(userId);\n  res.json({ success: true });\n});\n\nexport default app;`,
    lines: 15,
  },
  {
    id: 'file-3',
    name: 'utils/api.ts',
    path: 'src/utils/api.ts',
    language: 'TypeScript',
    content: `// API Keys - NEVER commit these!\nconst API_KEY = 'sk-1234567890abcdefghijklmnop';\nconst SECRET_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';\n\nconst BASE_URL = 'https://api.example.com';\n\nexport async function fetchData(endpoint: string) {\n  const response = await fetch(BASE_URL + endpoint, {\n    headers: {\n      'Authorization': \`Bearer \${API_KEY}\`,\n      'X-Secret-Token': SECRET_TOKEN\n    }\n  });\n  return response.json();\n}`,
    lines: 18,
  },
];

export function getSecurityVulnerabilities(): SecurityVulnerability[] {
  return DEMO_SECURITY_VULNERABILITIES;
}

export function getSecurityScan(): SecurityScanResult {
  return DEMO_SECURITY_SCAN;
}

export function getCodeFiles() {
  return DEMO_CODE_FILES;
}
