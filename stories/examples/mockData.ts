import type { GridColumn, GridRow } from '../../src/core/types/grid';

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
    // Define realistic columns with proper types using the new cell type system
    const columns: GridColumn[] = [
        // Text columns
        { id: 'firstName', title: 'First Name', width: 150, type: 'text', visible: true },
        { id: 'lastName', title: 'Last Name', width: 150, type: 'text', visible: true },
        
        // Email column (uses email cell type with validation)
        { id: 'email', title: 'Email', width: 250, type: 'email', visible: true },
        
        // Linked record column
        { id: 'company', title: 'Company (Linked)', width: 200, type: 'linked', visible: true },
        
        // Select column for job titles
        { 
            id: 'title', 
            title: 'Job Title', 
            width: 200, 
            type: 'select', 
            visible: true,
            typeOptions: {
                options: [
                    { value: 'CEO', label: 'CEO', color: '#ef4444' },
                    { value: 'CTO', label: 'CTO', color: '#f97316' },
                    { value: 'VP Sales', label: 'VP Sales', color: '#eab308' },
                    { value: 'VP Marketing', label: 'VP Marketing', color: '#22c55e' },
                    { value: 'Director of Engineering', label: 'Director of Engineering', color: '#3b82f6' },
                    { value: 'Head of Product', label: 'Head of Product', color: '#8b5cf6' },
                    { value: 'Senior Software Engineer', label: 'Senior Software Engineer', color: '#ec4899' },
                    { value: 'Product Manager', label: 'Product Manager', color: '#14b8a6' },
                    { value: 'Sales Manager', label: 'Sales Manager', color: '#f59e0b' },
                    { value: 'Marketing Director', label: 'Marketing Director', color: '#10b981' },
                    { value: 'Account Executive', label: 'Account Executive', color: '#6366f1' },
                ]
            }
        },
        
        // URL columns
        { id: 'linkedIn', title: 'LinkedIn URL', width: 300, type: 'url', visible: true },
        
        // Phone column (uses phone cell type with formatting)
        { id: 'phone', title: 'Phone', width: 150, type: 'phone', visible: true },
        
        // Text columns for location
        { id: 'city', title: 'City', width: 150, type: 'text', visible: true },
        { id: 'state', title: 'State', width: 100, type: 'text', visible: true },
        { id: 'country', title: 'Country', width: 120, type: 'text', visible: true },
        
        // Number columns
        { id: 'employees', title: 'Company Size', width: 130, type: 'number', visible: true, format: { thousandsSeparator: true, decimals: 0 } },
        { id: 'revenue', title: 'Annual Revenue', width: 150, type: 'number', visible: true, format: { prefix: '$', thousandsSeparator: true, decimals: 0 } },
        
        // Select column for industry
        { 
            id: 'industry', 
            title: 'Industry', 
            width: 180, 
            type: 'select', 
            visible: true,
            typeOptions: {
                options: [
                    { value: 'Technology', label: 'Technology', color: '#3b82f6' },
                    { value: 'Finance', label: 'Finance', color: '#22c55e' },
                    { value: 'Healthcare', label: 'Healthcare', color: '#ef4444' },
                    { value: 'Retail', label: 'Retail', color: '#f97316' },
                    { value: 'Manufacturing', label: 'Manufacturing', color: '#6b7280' },
                    { value: 'Education', label: 'Education', color: '#8b5cf6' },
                    { value: 'Consulting', label: 'Consulting', color: '#14b8a6' },
                    { value: 'Media', label: 'Media', color: '#ec4899' },
                    { value: 'Real Estate', label: 'Real Estate', color: '#eab308' },
                ]
            }
        },
        
        // URL column
        { id: 'website', title: 'Website', width: 250, type: 'url', visible: true },
        
        // Number columns
        { id: 'founded', title: 'Year Founded', width: 120, type: 'number', visible: true, format: { decimals: 0 } },
        
        // Select column for funding
        { 
            id: 'funding', 
            title: 'Funding Stage', 
            width: 150, 
            type: 'select', 
            visible: true,
            typeOptions: {
                options: [
                    { value: 'Seed', label: 'Seed', color: '#94a3b8' },
                    { value: 'Series A', label: 'Series A', color: '#22c55e' },
                    { value: 'Series B', label: 'Series B', color: '#3b82f6' },
                    { value: 'Series C', label: 'Series C', color: '#8b5cf6' },
                    { value: 'IPO', label: 'IPO', color: '#f97316' },
                    { value: 'Bootstrapped', label: 'Bootstrapped', color: '#6b7280' },
                ]
            }
        },
        
        { id: 'twitter', title: 'Twitter Handle', width: 180, type: 'text', visible: true },
        
        // Select column for department
        { 
            id: 'department', 
            title: 'Department', 
            width: 150, 
            type: 'select', 
            visible: true,
            typeOptions: {
                options: [
                    { value: 'Engineering', label: 'Engineering', color: '#3b82f6' },
                    { value: 'Sales', label: 'Sales', color: '#22c55e' },
                    { value: 'Marketing', label: 'Marketing', color: '#ec4899' },
                    { value: 'Operations', label: 'Operations', color: '#f97316' },
                    { value: 'Finance', label: 'Finance', color: '#6b7280' },
                    { value: 'HR', label: 'HR', color: '#8b5cf6' },
                    { value: 'Product', label: 'Product', color: '#14b8a6' },
                ]
            }
        },
        
        // Select column for seniority
        { 
            id: 'seniority', 
            title: 'Seniority Level', 
            width: 150, 
            type: 'select', 
            visible: true,
            typeOptions: {
                options: [
                    { value: 'Entry', label: 'Entry', color: '#94a3b8' },
                    { value: 'Mid-Level', label: 'Mid-Level', color: '#22c55e' },
                    { value: 'Senior', label: 'Senior', color: '#3b82f6' },
                    { value: 'Lead', label: 'Lead', color: '#8b5cf6' },
                    { value: 'Principal', label: 'Principal', color: '#f97316' },
                    { value: 'VP', label: 'VP', color: '#ec4899' },
                    { value: 'C-Level', label: 'C-Level', color: '#ef4444' },
                ]
            }
        },
        
        { id: 'location', title: 'Full Location', width: 250, type: 'text', visible: true },
        { id: 'timezone', title: 'Timezone', width: 120, type: 'text', visible: true },
        { id: 'languageSkills', title: 'Languages', width: 200, type: 'text', visible: true },
        { id: 'education', title: 'Education', width: 200, type: 'text', visible: true },
        
        // Number column for experience
        { id: 'yearsExperience', title: 'Years of Experience', width: 150, type: 'number', visible: true, format: { decimals: 0 } },
        
        { id: 'skills', title: 'Top Skills', width: 300, type: 'text', visible: true },
        { id: 'interests', title: 'Interests', width: 250, type: 'text', visible: true },
        
        // Date column
        { id: 'lastContact', title: 'Last Contact Date', width: 150, type: 'date', visible: true, format: { dateFormat: 'MM/DD/YYYY' } },
        
        // Boolean column
        { id: 'verified', title: 'Verified', width: 100, type: 'boolean', visible: true },
        
        // Progress column for lead score
        { 
            id: 'leadScore', 
            title: 'Lead Score', 
            width: 150, 
            type: 'progress', 
            visible: true,
            typeOptions: {
                min: 0,
                max: 100,
                showLabel: true,
                color: '#3b82f6'
            }
        },
        
        // Select column for status
        { 
            id: 'status', 
            title: 'Lead Status', 
            width: 150, 
            type: 'select', 
            visible: true,
            typeOptions: {
                options: [
                    { value: 'New', label: 'New', color: '#94a3b8' },
                    { value: 'Contacted', label: 'Contacted', color: '#3b82f6' },
                    { value: 'Qualified', label: 'Qualified', color: '#22c55e' },
                    { value: 'Proposal', label: 'Proposal', color: '#f97316' },
                    { value: 'Negotiation', label: 'Negotiation', color: '#eab308' },
                    { value: 'Closed Won', label: 'Closed Won', color: '#10b981' },
                    { value: 'Closed Lost', label: 'Closed Lost', color: '#ef4444' },
                ]
            }
        },
        
        { id: 'notes', title: 'Notes', width: 300, type: 'text', visible: true },
    ];

    // Add AI enrichment columns if requested (using text type for now)
    if (includeAIColumns) {
        columns.push(
            {
                id: 'companyEmail',
                title: 'Company Email (AI)',
                width: 250,
                type: 'email', // AI-generated email
                visible: true,
            },
            {
                id: 'personalityProfile',
                title: 'Personality (AI)',
                width: 300,
                type: 'text', // AI-generated text
                visible: true,
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

        // Generate phone number as digits only (phone cell type will format it)
        const phoneDigits = `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`;
        
        // Generate lead score (0-100)
        const leadScore = Math.floor(Math.random() * 100);

        const row: GridRow = {
            id: `row_${i}`,
            cells: new Map([
                ['firstName', { value: `${firstName}_${Math.floor(i / firstNames.length)}` }],
                ['lastName', { value: `${lastName}_${Math.floor(i / lastNames.length)}` }],
                ['email', { value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` }],
                ['company', { value: companyObj }], // Passes full object for linked type
                ['title', { value: titles[i % titles.length] }],
                ['linkedIn', { value: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${i}` }],
                ['phone', { value: phoneDigits }], // Phone type will format this
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
                ['leadScore', { value: leadScore }], // Progress type (0-100)
                ['status', { value: statuses[i % statuses.length] }],
                ['notes', { value: i % 3 === 0 ? 'High priority lead' : i % 3 === 1 ? 'Follow up next week' : '' }],
            ])
        };

        rows.push(row);
    }

    return { columns, rows };
}
