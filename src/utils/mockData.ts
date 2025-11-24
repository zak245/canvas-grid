import { GridColumn, GridRow } from '../types/grid';

export interface CompanyEntity {
    id: string;
    name: string;
    domain: string;
    logo: string;
    employees: number;
}

export const generateCompanyPool = (count: number = 50): CompanyEntity[] => {
    // Real companies for better logos
    const companies = [
        { name: 'Google', domain: 'google.com' },
        { name: 'Apple', domain: 'apple.com' },
        { name: 'Microsoft', domain: 'microsoft.com' },
        { name: 'Amazon', domain: 'amazon.com' },
        { name: 'Meta', domain: 'meta.com' },
        { name: 'Netflix', domain: 'netflix.com' },
        { name: 'Tesla', domain: 'tesla.com' },
        { name: 'Spotify', domain: 'spotify.com' },
        { name: 'Airbnb', domain: 'airbnb.com' },
        { name: 'Uber', domain: 'uber.com' },
        { name: 'Lyft', domain: 'lyft.com' },
        { name: 'Slack', domain: 'slack.com' },
        { name: 'Stripe', domain: 'stripe.com' },
        { name: 'Twilio', domain: 'twilio.com' },
        { name: 'Zoom', domain: 'zoom.us' },
        { name: 'Salesforce', domain: 'salesforce.com' },
        { name: 'Intel', domain: 'intel.com' },
        { name: 'Nvidia', domain: 'nvidia.com' },
        { name: 'AMD', domain: 'amd.com' },
        { name: 'Shopify', domain: 'shopify.com' },
        { name: 'Dropbox', domain: 'dropbox.com' },
        { name: 'Box', domain: 'box.com' },
        { name: 'Asana', domain: 'asana.com' },
        { name: 'Atlassian', domain: 'atlassian.com' },
        { name: 'GitHub', domain: 'github.com' }
    ];
    
    return Array.from({ length: count }, (_, i) => {
        const comp = companies[i % companies.length];
        return {
            id: `comp_ref_${i}`,
            name: comp.name,
            domain: comp.domain,
            logo: `https://logo.clearbit.com/${comp.domain}`,
            employees: Math.floor(Math.random() * 50000) + 100
        };
    });
};

// Generate realistic mock data for a Clay-like product
export function generateMockData(
    numRows: number = 100000,
    includeAIColumns: boolean = false
): { columns: GridColumn[]; rows: GridRow[] } {
    // Define realistic columns with proper types
    const columns: GridColumn[] = [
        { id: 'firstName', title: 'First Name', width: 150, type: 'text', visible: true },
        { id: 'lastName', title: 'Last Name', width: 150, type: 'text', visible: true },
        { id: 'email', title: 'Email', width: 250, type: 'email', visible: true },
        { id: 'company', title: 'Company (Linked)', width: 200, type: 'linked', visible: true },
        { id: 'title', title: 'Job Title', width: 200, type: 'text', visible: true },
        { id: 'linkedIn', title: 'LinkedIn URL', width: 300, type: 'url', visible: true },
        { id: 'phone', title: 'Phone', width: 150, type: 'text', visible: true },
        { id: 'city', title: 'City', width: 150, type: 'text', visible: true },
        { id: 'state', title: 'State', width: 100, type: 'text', visible: true },
        { id: 'country', title: 'Country', width: 120, type: 'text', visible: true },
        { id: 'employees', title: 'Company Size', width: 130, type: 'number', visible: true, format: { thousandsSeparator: true, decimals: 0 } },
        { id: 'revenue', title: 'Annual Revenue', width: 150, type: 'number', visible: true, format: { prefix: '$', thousandsSeparator: true, decimals: 0 } },
        { id: 'industry', title: 'Industry', width: 180, type: 'text', visible: true },
        { id: 'website', title: 'Website', width: 250, type: 'url', visible: true },
        { id: 'founded', title: 'Year Founded', width: 120, type: 'number', visible: true, format: { decimals: 0 } },
        { id: 'funding', title: 'Funding Stage', width: 150, type: 'text', visible: true },
        { id: 'twitter', title: 'Twitter Handle', width: 180, type: 'text', visible: true },
        { id: 'department', title: 'Department', width: 150, type: 'text', visible: true },
        { id: 'seniority', title: 'Seniority Level', width: 150, type: 'text', visible: true },
        { id: 'location', title: 'Full Location', width: 250, type: 'text', visible: true },
        { id: 'timezone', title: 'Timezone', width: 120, type: 'text', visible: true },
        { id: 'languageSkills', title: 'Languages', width: 200, type: 'text', visible: true },
        { id: 'education', title: 'Education', width: 200, type: 'text', visible: true },
        { id: 'yearsExperience', title: 'Years of Experience', width: 150, type: 'number', visible: true, format: { decimals: 0 } },
        { id: 'skills', title: 'Top Skills', width: 300, type: 'text', visible: true },
        { id: 'interests', title: 'Interests', width: 250, type: 'text', visible: true },
        { id: 'lastContact', title: 'Last Contact Date', width: 150, type: 'date', visible: true, format: { dateFormat: 'MM/DD/YYYY' } },
        { id: 'verified', title: 'Verified', width: 100, type: 'boolean', visible: true, format: { booleanDisplay: 'checkbox' } },
        { id: 'status', title: 'Lead Status', width: 130, type: 'text', visible: true },
        { id: 'notes', title: 'Notes', width: 300, type: 'text', visible: true },
    ];

    // Add AI enrichment columns if requested
    if (includeAIColumns) {
        columns.push(
            {
                id: 'companyEmail',
                title: 'Company Email (AI)',
                width: 250,
                type: 'ai',
                visible: true,
                aiConfig: {
                    prompt: 'Find the work email for this person',
                    model: 'gpt-4'
                }
            },
            {
                id: 'personalityProfile',
                title: 'Personality (AI)',
                width: 300,
                type: 'ai',
                visible: true,
                aiConfig: {
                    prompt: 'Based on their job title and company, describe their likely personality and communication style',
                    model: 'gpt-4'
                }
            }
        );
    }

    // Sample data pools
    const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Emily', 'Robert', 'Jennifer', 'William', 'Jessica', 'Richard', 'Amanda', 'Daniel', 'Melissa', 'Thomas', 'Elizabeth'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];
    const titles = ['CEO', 'CTO', 'VP Sales', 'VP Marketing', 'Director of Engineering', 'Head of Product', 'Senior Software Engineer', 'Product Manager', 'Sales Manager', 'Marketing Director', 'Account Executive'];
    const cities = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston', 'Chicago', 'Los Angeles', 'Denver', 'Atlanta', 'Miami'];
    const states = ['CA', 'NY', 'TX', 'WA', 'MA', 'IL', 'CO', 'GA', 'FL'];
    const countries = ['United States', 'Canada', 'United Kingdom'];
    const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Consulting', 'Media', 'Real Estate'];
    const fundingStages = ['Seed', 'Series A', 'Series B', 'Series C', 'IPO', 'Bootstrapped'];
    const departments = ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Product'];
    const seniorities = ['Entry', 'Mid-Level', 'Senior', 'Lead', 'Principal', 'VP', 'C-Level'];
    const timezones = ['PST', 'EST', 'CST', 'MST', 'GMT', 'CET'];
    const languages = ['English', 'Spanish, English', 'English, Mandarin', 'English, French', 'English, German'];
    const educations = ['BS Computer Science - MIT', 'MBA - Harvard', 'BA Economics - Stanford', 'MS Engineering - Berkeley'];
    const skills = ['JavaScript, React, Node.js', 'Python, Django, ML', 'Java, Spring, AWS', 'Sales, CRM, Negotiation'];
    const interests = ['AI/ML, Startups', 'SaaS, Enterprise', 'FinTech, Blockchain', 'B2B Sales'];
    const statuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

    const companyPool = generateCompanyPool(50);

    // Generate rows
    const rows: GridRow[] = [];
    for (let i = 0; i < numRows; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[i % lastNames.length];
        
        // Select Linked Record from Pool
        const companyObj = companyPool[i % companyPool.length];
        // Use companyObj properties for related columns to ensure consistency
        const companyName = companyObj.name;
        const companyDomain = companyObj.domain;

        const city = cities[i % cities.length];
        const state = states[i % states.length];

        const row: GridRow = {
            id: `row_${i}`,
            cells: new Map([
                ['firstName', { value: `${firstName}_${Math.floor(i / firstNames.length)}` }],
                ['lastName', { value: `${lastName}_${Math.floor(i / lastNames.length)}` }],
                ['email', { value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` }],
                ['company', { value: companyObj }], // Passes full object
                ['title', { value: titles[i % titles.length] }],
                ['linkedIn', { value: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${i}` }],
                ['phone', { value: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` }],
                ['city', { value: city }],
                ['state', { value: state }],
                ['country', { value: countries[i % countries.length] }],
                ['employees', { value: companyObj.employees }],
                ['revenue', { value: Math.floor(Math.random() * 100000000) + 1000000 }],
                ['industry', { value: industries[i % industries.length] }],
                ['website', { value: `https://${companyDomain}` }],
                ['founded', { value: 1990 + (i % 35) }],
                ['funding', { value: fundingStages[i % fundingStages.length] }],
                ['twitter', { value: `@${companyName.replace(/\s/g, '').toLowerCase()}` }],
                ['department', { value: departments[i % departments.length] }],
                ['seniority', { value: seniorities[i % seniorities.length] }],
                ['location', { value: `${city}, ${state}, ${countries[i % countries.length]}` }],
                ['timezone', { value: timezones[i % timezones.length] }],
                ['languageSkills', { value: languages[i % languages.length] }],
                ['education', { value: educations[i % educations.length] }],
                ['yearsExperience', { value: 1 + (i % 25) }],
                ['skills', { value: skills[i % skills.length] }],
                ['interests', { value: interests[i % interests.length] }],
                ['lastContact', { value: new Date(2024, i % 12, (i % 28) + 1) }],
                ['verified', { value: i % 3 === 0 }],
                ['status', { value: statuses[i % statuses.length] }],
                ['notes', { value: i % 3 === 0 ? 'High priority lead' : i % 3 === 1 ? 'Follow up next week' : '' }],
            ])
        };

        rows.push(row);
    }

    return { columns, rows };
}
