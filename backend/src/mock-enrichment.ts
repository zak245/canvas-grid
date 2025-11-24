/**
 * Mock Enrichment Services
 * 
 * Simulates GTM operations like Apollo.io, Clay, etc.
 * All functions include realistic delays and generate plausible data.
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== CONTACT ENRICHMENT ====================

export async function findEmail(params: {
  firstName?: string;
  lastName?: string;
  company?: string;
  domain?: string;
}): Promise<{ email: string; confidence: number; source: string }> {
  await delay(800 + Math.random() * 400); // 800-1200ms delay

  const { firstName, lastName, company, domain } = params;
  
  // Generate plausible email
  let email = '';
  if (firstName && lastName && domain) {
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const patterns = [
      `${first}.${last}@${domain}`,
      `${first}${last}@${domain}`,
      `${first[0]}${last}@${domain}`,
      `${first}_${last}@${domain}`,
    ];
    email = patterns[Math.floor(Math.random() * patterns.length)];
  } else if (firstName && lastName && company) {
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const companyDomain = company.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    email = `${first}.${last}@${companyDomain}`;
  } else {
    email = 'unknown@example.com';
  }

  const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence

  return {
    email,
    confidence: Math.round(confidence * 100) / 100,
    source: 'mock_hunter',
  };
}

export async function findPhone(params: {
  email?: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ phone: string; confidence: number; type: string }> {
  await delay(600 + Math.random() * 400);

  // Generate plausible US phone number
  const areaCode = 200 + Math.floor(Math.random() * 800);
  const exchange = 200 + Math.floor(Math.random() * 800);
  const number = 1000 + Math.floor(Math.random() * 9000);
  const phone = `+1 (${areaCode}) ${exchange}-${number}`;

  return {
    phone,
    confidence: 0.65 + Math.random() * 0.25,
    type: Math.random() > 0.5 ? 'mobile' : 'direct',
  };
}

export async function enrichPersonDetails(params: {
  email?: string;
  firstName?: string;
  lastName?: string;
}): Promise<{
  title?: string;
  linkedin?: string;
  location?: string;
  seniority?: string;
  department?: string;
}> {
  await delay(1000 + Math.random() * 500);

  const titles = [
    'CEO', 'CTO', 'VP of Sales', 'VP of Marketing', 'Director of Engineering',
    'Head of Product', 'Sales Manager', 'Account Executive', 'Software Engineer',
    'Product Manager', 'Marketing Manager', 'Business Development Manager',
  ];

  const locations = [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
    'Boston, MA', 'Los Angeles, CA', 'Chicago, IL', 'Denver, CO',
    'Remote', 'London, UK', 'Toronto, CA',
  ];

  const seniorities = ['C-Level', 'VP', 'Director', 'Manager', 'Individual Contributor'];
  const departments = ['Executive', 'Engineering', 'Sales', 'Marketing', 'Product', 'Operations'];

  const { firstName, lastName } = params;
  const linkedinUrl = firstName && lastName
    ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`
    : 'https://linkedin.com/in/unknown';

  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    linkedin: linkedinUrl,
    location: locations[Math.floor(Math.random() * locations.length)],
    seniority: seniorities[Math.floor(Math.random() * seniorities.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
  };
}

// ==================== COMPANY ENRICHMENT ====================

export async function enrichCompanyDetails(params: {
  company?: string;
  domain?: string;
}): Promise<{
  industry?: string;
  size?: string;
  revenue?: string;
  description?: string;
  founded?: number;
  location?: string;
}> {
  await delay(900 + Math.random() * 600);

  const industries = [
    'Software', 'SaaS', 'E-commerce', 'FinTech', 'HealthTech', 'EdTech',
    'Enterprise Software', 'Consumer Software', 'Developer Tools', 'Marketing Technology',
    'Sales Technology', 'AI/ML', 'Cybersecurity', 'Cloud Infrastructure',
  ];

  const sizes = [
    '1-10', '11-50', '51-200', '201-500', '501-1000',
    '1001-5000', '5001-10000', '10000+',
  ];

  const revenues = [
    '$0-1M', '$1M-5M', '$5M-10M', '$10M-50M', '$50M-100M',
    '$100M-500M', '$500M-1B', '$1B+',
  ];

  const locations = [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
    'Palo Alto, CA', 'Mountain View, CA', 'Boston, MA', 'Los Angeles, CA',
  ];

  const { company } = params;
  const description = company
    ? `${company} is a leading provider of innovative solutions in the technology sector.`
    : 'A technology company focused on innovation.';

  return {
    industry: industries[Math.floor(Math.random() * industries.length)],
    size: sizes[Math.floor(Math.random() * sizes.length)],
    revenue: revenues[Math.floor(Math.random() * revenues.length)],
    description,
    founded: 2000 + Math.floor(Math.random() * 24), // 2000-2024
    location: locations[Math.floor(Math.random() * locations.length)],
  };
}

export async function enrichCompanyTechnologies(params: {
  domain?: string;
}): Promise<{ technologies: string[]; categories: string[] }> {
  await delay(700 + Math.random() * 400);

  const allTech = [
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Ruby on Rails',
    'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes',
    'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Salesforce', 'HubSpot', 'Zendesk', 'Stripe', 'Twilio',
    'Google Analytics', 'Segment', 'Mixpanel', 'Amplitude',
  ];

  const categories = [
    'Frontend Framework', 'Backend Framework', 'Cloud Infrastructure',
    'Database', 'Analytics', 'CRM', 'Payment Processing', 'Developer Tools',
  ];

  const techCount = 5 + Math.floor(Math.random() * 8); // 5-12 technologies
  const technologies = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < techCount; i++) {
    let idx = Math.floor(Math.random() * allTech.length);
    while (usedIndices.has(idx)) {
      idx = Math.floor(Math.random() * allTech.length);
    }
    usedIndices.add(idx);
    technologies.push(allTech[idx]);
  }

  return {
    technologies,
    categories: categories.slice(0, 3 + Math.floor(Math.random() * 3)),
  };
}

export async function enrichCompanyFunding(params: {
  company?: string;
}): Promise<{
  totalFunding?: string;
  lastRound?: string;
  lastRoundAmount?: string;
  investors?: string[];
  stage?: string;
}> {
  await delay(800 + Math.random() * 500);

  const stages = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'IPO', 'Acquired'];
  const roundTypes = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D'];
  
  const investors = [
    'Sequoia Capital', 'Andreessen Horowitz', 'Accel', 'Kleiner Perkins',
    'Benchmark', 'Greylock Partners', 'Index Ventures', 'Lightspeed Venture Partners',
    'First Round Capital', 'Y Combinator', 'Founders Fund', 'NEA',
  ];

  const investorCount = 2 + Math.floor(Math.random() * 4);
  const selectedInvestors = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < investorCount; i++) {
    let idx = Math.floor(Math.random() * investors.length);
    while (usedIndices.has(idx)) {
      idx = Math.floor(Math.random() * investors.length);
    }
    usedIndices.add(idx);
    selectedInvestors.push(investors[idx]);
  }

  const totalAmount = [1, 5, 10, 25, 50, 100, 250, 500][Math.floor(Math.random() * 8)];
  const lastRoundAmount = [0.5, 1, 5, 10, 25, 50, 100][Math.floor(Math.random() * 7)];

  return {
    totalFunding: `$${totalAmount}M`,
    lastRound: roundTypes[Math.floor(Math.random() * roundTypes.length)],
    lastRoundAmount: `$${lastRoundAmount}M`,
    investors: selectedInvestors,
    stage: stages[Math.floor(Math.random() * stages.length)],
  };
}

// ==================== AI ENRICHMENT ====================

export async function aiResearch(params: {
  prompt: string;
  context: Record<string, any>;
}): Promise<{ result: string; confidence: number }> {
  await delay(1500 + Math.random() * 1000); // Longer for AI

  const { prompt, context } = params;

  // Generate mock AI response based on prompt keywords
  let result = '';
  
  if (prompt.toLowerCase().includes('news')) {
    result = `Recent developments show positive growth trends. The company has announced new partnerships and product launches in Q1 2024.`;
  } else if (prompt.toLowerCase().includes('industry') || prompt.toLowerCase().includes('classify')) {
    const industries = ['SaaS', 'E-commerce', 'FinTech', 'HealthTech', 'Enterprise Software'];
    result = industries[Math.floor(Math.random() * industries.length)];
  } else if (prompt.toLowerCase().includes('summary')) {
    result = `A technology company focused on innovative solutions, serving mid-market and enterprise customers.`;
  } else {
    result = `Based on available data, the analysis suggests strong market positioning with competitive advantages in their sector.`;
  }

  return {
    result,
    confidence: 0.7 + Math.random() * 0.25,
  };
}

export async function aiClassify(params: {
  prompt: string;
  context: Record<string, any>;
  categories: string[];
}): Promise<{ category: string; confidence: number; reasoning: string }> {
  await delay(1200 + Math.random() * 800);

  const { categories } = params;
  const category = categories[Math.floor(Math.random() * categories.length)];

  return {
    category,
    confidence: 0.75 + Math.random() * 0.2,
    reasoning: `Classification based on analysis of provided context and industry patterns.`,
  };
}

