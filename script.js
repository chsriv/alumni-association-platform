// =============== GLOBAL STATE ===============
let isLoggedIn = false;
let currentUser = null;
let pendingAction = null;
let sessionTimeout = null;

// =============== SECURITY UTILITIES ===============

// Rate limiting for login attempts
const loginAttempts = {
    count: 0,
    lastAttempt: null,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
};

// Sanitize HTML to prevent XSS attacks
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Validate input length
function validateInput(input, minLength = 1, maxLength = 500) {
    if (!input || typeof input !== 'string') return false;
    const trimmed = input.trim();
    return trimmed.length >= minLength && trimmed.length <= maxLength;
}

// Check for spam patterns
function containsSpam(text) {
    const spamPatterns = [
        /viagra|cialis|prescription/i,
        /\b(click here|buy now|limited offer)\b/i,
        /(https?:\/\/[^\s]+){3,}/i // Multiple URLs
    ];
    return spamPatterns.some(pattern => pattern.test(text));
}

// Session management (30 minutes of inactivity)
const SESSION_DURATION = 30 * 60 * 1000;

function resetSessionTimer() {
    if (!isLoggedIn) return;
    
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        alert('⚠️ Session expired due to inactivity. Please login again.');
        logout();
    }, SESSION_DURATION);
}

function logout() {
    isLoggedIn = false;
    currentUser = null;
    clearTimeout(sessionTimeout);
    sessionStorage.clear();
    navigate('home');
    alert('✅ Logged out successfully.');
}

// Obfuscate email for non-logged-in users
function obfuscateEmail(email) {
    if (!email) return '';
    if (isLoggedIn) return email;
    
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    return `${user.substring(0, 3)}***@${domain}`;
}

// =============== DATA STRUCTURES ===============

// Expanded Alumni Profiles Data (2015-2025)
const alumniProfiles = [
    { name: "Dr. Rajesh Kumar", stream: "engineering", year: "2015", company: "Google", position: "Senior Software Engineer", location: "Bangalore", email: "rajesh.kumar@gitam.in", bio: "Specialized in distributed systems and cloud architecture. Leading Google Cloud Platform initiatives.", research: "Machine Learning in Distributed Systems", icon: "👨‍💻", lastActive: "2 days ago" },
    { name: "Dr. Priya Sharma", stream: "medicine", year: "2015", company: "AIIMS Delhi", position: "Chief Cardiologist", location: "Delhi", email: "priya.sharma@gitam.in", bio: "Pioneer in minimally invasive cardiac surgery. Published over 50 research papers.", research: "Novel Approaches in Cardiac Intervention", icon: "👩‍⚕️", lastActive: "5 hours ago" },
    { name: "Prof. Amit Patel", stream: "science", year: "2016", company: "IIT Bombay", position: "Research Professor", location: "Mumbai", email: "amit.patel@gitam.edu", bio: "Leading research in quantum computing and theoretical physics.", research: "Quantum Entanglement in Computing Systems", icon: "👨‍🔬", lastActive: "1 day ago" },
    { name: "Anil Deshmukh", stream: "engineering", year: "2016", company: "Intel", position: "Chip Design Engineer", location: "USA", email: "anil.d@gitam.in", bio: "Working on next-generation processor architectures.", research: null, icon: "👨‍💻", lastActive: "3 days ago" },
    { name: "Dr. Sneha Reddy", stream: "science", year: "2017", company: "ISRO", position: "Space Scientist", location: "Bangalore", email: "sneha.reddy@gitam.edu", bio: "Contributing to India's space missions and satellite technology.", research: "Advanced Propulsion Systems for Deep Space Exploration", icon: "👩‍🚀", lastActive: "1 week ago" },
    { name: "Arjun Mehta", stream: "law", year: "2017", company: "Supreme Court", position: "Senior Advocate", location: "Delhi", email: "arjun.mehta@gitam.in", bio: "Specializing in constitutional law and human rights.", research: null, icon: "👨‍⚖️", lastActive: "4 days ago" },
    { name: "Sarah Williams", stream: "business", year: "2018", company: "McKinsey & Company", position: "Management Consultant", location: "Mumbai", email: "sarah.w@gitam.edu", bio: "Helping Fortune 500 companies with digital transformation strategies.", research: null, icon: "👩‍💼", lastActive: "6 hours ago" },
    { name: "Neha Gupta", stream: "humanities", year: "2018", company: "United Nations", position: "Policy Analyst", location: "Geneva", email: "neha.gupta@gitam.in", bio: "Working on sustainable development goals and climate policy.", research: "Climate Policy and Economic Development in Emerging Nations", icon: "👩‍💼", lastActive: "2 days ago" },
    { name: "Meera Joshi", stream: "business", year: "2018", company: "Goldman Sachs", position: "Investment Banker", location: "New York", email: "meera.joshi@gitam.edu", bio: "Managing high-value M&A deals in technology sector.", research: null, icon: "👩‍💼", lastActive: "1 day ago" },
    { name: "Rahul Verma", stream: "engineering", year: "2019", company: "Microsoft", position: "Cloud Architect", location: "Hyderabad", email: "rahul.verma@gitam.in", bio: "Designing scalable cloud solutions for enterprise clients.", research: null, icon: "👨‍💻", lastActive: "12 hours ago" },
    { name: "Kavya Iyer", stream: "arts", year: "2019", company: "National Gallery", position: "Chief Curator", location: "Delhi", email: "kavya.iyer@gitam.edu", bio: "Curating contemporary Indian art exhibitions internationally.", research: "Digital Art and Cultural Preservation", icon: "👩‍🎨", lastActive: "3 days ago" },
    { name: "Siddharth Nair", stream: "engineering", year: "2019", company: "SpaceX", position: "Aerospace Engineer", location: "USA", email: "siddharth.n@gitam.in", bio: "Working on reusable rocket technology and Mars mission planning.", research: null, icon: "👨‍🚀", lastActive: "5 days ago" },
    { name: "Dr. Ananya Singh", stream: "medicine", year: "2020", company: "Apollo Hospitals", position: "Neurologist", location: "Chennai", email: "ananya.singh@gitam.edu", bio: "Specialist in neurodegenerative diseases and brain imaging.", research: "Early Detection of Alzheimer's Using AI", icon: "👩‍⚕️", lastActive: "8 hours ago" },
    { name: "Vikram Reddy", stream: "engineering", year: "2020", company: "Amazon", position: "Senior Data Scientist", location: "Bangalore", email: "vikram.reddy@gitam.in", bio: "Building recommendation systems and predictive analytics platforms.", research: null, icon: "👨‍💻", lastActive: "1 day ago" },
    { name: "Divya Krishnan", stream: "arts", year: "2020", company: "Netflix", position: "Content Director", location: "Mumbai", email: "divya.k@gitam.edu", bio: "Leading regional content strategy for streaming platform.", research: null, icon: "👩‍🎬", lastActive: "2 days ago" },
    { name: "Sanjay Krishnan", stream: "engineering", year: "2021", company: "Tesla", position: "AI Engineer", location: "USA", email: "sanjay.k@gitam.in", bio: "Developing autonomous driving algorithms and computer vision systems.", research: "Deep Learning for Real-time Object Detection", icon: "👨‍💻", lastActive: "3 hours ago" },
    { name: "Priyanka Menon", stream: "science", year: "2021", company: "Pfizer", position: "Research Scientist", location: "Pune", email: "priyanka.m@gitam.edu", bio: "Working on vaccine development and immunology research.", research: "mRNA Vaccine Technology and Future Applications", icon: "👩‍🔬", lastActive: "1 day ago" },
    { name: "Aditya Sharma", stream: "engineering", year: "2021", company: "Apple", position: "iOS Developer", location: "Bangalore", email: "aditya.sharma@gitam.in", bio: "Building next-generation mobile experiences and AR applications.", research: null, icon: "👨‍💻", lastActive: "4 hours ago" },
    { name: "Rohan Kapoor", stream: "business", year: "2022", company: "Startup Founder", position: "CEO - EdTech", location: "Bangalore", email: "rohan.kapoor@gitam.edu", bio: "Building AI-powered personalized learning platform for students.", research: null, icon: "👨‍💼", lastActive: "2 hours ago" },
    { name: "Anjali Desai", stream: "engineering", year: "2022", company: "Meta", position: "Software Engineer", location: "Hyderabad", email: "anjali.desai@gitam.in", bio: "Working on VR/AR platforms and metaverse infrastructure.", research: null, icon: "👩‍💻", lastActive: "6 days ago" },
    { name: "Karthik Menon", stream: "humanities", year: "2022", company: "World Bank", position: "Economic Analyst", location: "Washington DC", email: "karthik.menon@gitam.edu", bio: "Analyzing economic development strategies for developing nations.", research: "Fintech and Financial Inclusion in Rural India", icon: "👨‍💼", lastActive: "1 week ago" },
    { name: "Ishita Roy", stream: "medicine", year: "2023", company: "Johns Hopkins", position: "Resident Doctor", location: "USA", email: "ishita.roy@student.gitam.edu", bio: "Specializing in pediatric oncology and cancer research.", research: "Targeted Therapy in Childhood Cancers", icon: "👩‍⚕️", lastActive: "10 hours ago" },
    { name: "Varun Malhotra", stream: "engineering", year: "2023", company: "NVIDIA", position: "GPU Engineer", location: "Pune", email: "varun.m@student.gitam.edu", bio: "Developing next-gen graphics processors for AI workloads.", research: null, icon: "👨‍💻", lastActive: "1 day ago" },
    { name: "Nisha Agarwal", stream: "science", year: "2023", company: "MIT", position: "PhD Candidate", location: "USA", email: "nisha.agarwal@student.gitam.edu", bio: "Researching renewable energy and sustainable materials.", research: "Perovskite Solar Cells: Efficiency and Stability", icon: "👩‍🔬", lastActive: "3 days ago" },
    { name: "Akash Verma", stream: "engineering", year: "2024", company: "Adobe", position: "ML Engineer", location: "Bangalore", email: "akash.verma@student.gitam.edu", bio: "Building AI-powered creative tools and generative AI features.", research: null, icon: "👨‍💻", lastActive: "5 hours ago" },
    { name: "Pooja Reddy", stream: "business", year: "2024", company: "Deloitte", position: "Business Analyst", location: "Mumbai", email: "pooja.reddy@student.gitam.edu", bio: "Providing strategic consulting for digital transformation projects.", research: null, icon: "👩‍💼", lastActive: "2 days ago" },
    { name: "Vivek Singh", stream: "engineering", year: "2024", company: "IBM", position: "Blockchain Developer", location: "Bangalore", email: "vivek.singh@student.gitam.edu", bio: "Implementing blockchain solutions for supply chain and finance.", research: null, icon: "👨‍💻", lastActive: "4 days ago" },
    { name: "Shreya Patel", stream: "science", year: "2025", company: "Stanford", position: "Graduate Student", location: "USA", email: "shreya.patel@student.gitam.edu", bio: "Pursuing masters in Computational Biology and Bioinformatics.", research: "CRISPR Gene Editing: Applications in Disease Treatment", icon: "👩‍🔬", lastActive: "1 day ago" },
    { name: "Ravi Kumar", stream: "engineering", year: "2025", company: "Infosys", position: "Software Developer", location: "Hyderabad", email: "ravi.kumar@student.gitam.edu", bio: "Working on enterprise software solutions and cloud migration.", research: null, icon: "👨‍💻", lastActive: "7 hours ago" },
    { name: "Aditi Sharma", stream: "arts", year: "2025", company: "Freelance", position: "UX Designer", location: "Bangalore", email: "aditi.sharma@student.gitam.edu", bio: "Creating user-centered designs for mobile and web applications.", research: null, icon: "👩‍🎨", lastActive: "9 hours ago" }
];

// Sample Job Listings Data
const jobListings = [
    { title: "Senior Software Engineer", company: "Tech Corp", domain: "engineering", type: "fulltime", location: "Bangalore", salary: "₹25-35 LPA", icon: "💻" },
    { title: "Medical Officer", company: "City Hospital", domain: "medicine", type: "fulltime", location: "Mumbai", salary: "₹15-20 LPA", icon: "🏥" },
    { title: "Financial Analyst", company: "Finance Pro", domain: "business", type: "fulltime", location: "Delhi", salary: "₹12-18 LPA", icon: "💰" },
    { title: "Research Intern", company: "Science Lab", domain: "research", type: "internship", location: "Pune", salary: "₹30k/month", icon: "🔬" },
    { title: "Data Scientist", company: "Analytics Inc", domain: "engineering", type: "fulltime", location: "Hyderabad", salary: "₹20-30 LPA", icon: "📊" },
    { title: "Product Manager", company: "Startup XYZ", domain: "business", type: "fulltime", location: "Bangalore", salary: "₹18-25 LPA", icon: "📱" },
    { title: "Civil Engineer", company: "Construction Co", domain: "engineering", type: "contract", location: "Chennai", salary: "₹10-15 LPA", icon: "🏗️" },
    { title: "Teacher", company: "International School", domain: "education", type: "fulltime", location: "Kolkata", salary: "₹8-12 LPA", icon: "👨‍🏫" },
    { title: "NGO Coordinator", company: "Help Foundation", domain: "nonprofit", type: "fulltime", location: "Multiple", salary: "₹6-10 LPA", icon: "🤝" },
    { title: "Government Officer", company: "Public Service", domain: "government", type: "fulltime", location: "Various", salary: "₹8-15 LPA", icon: "🏛️" }
];

// Sample Events Data
const events = [
    { title: "Annual Alumni Meet 2026", date: "2026-03-15", location: "Campus Auditorium", description: "Join us for networking and nostalgia", icon: "🎓" },
    { title: "Tech Career Fair", date: "2026-04-20", location: "Convention Center", description: "Explore opportunities with top companies", icon: "💼" },
    { title: "Sports Tournament", date: "2026-05-10", location: "University Stadium", description: "Alumni vs Current Students", icon: "⚽" },
    { title: "Entrepreneurship Workshop", date: "2026-06-05", location: "Innovation Hub", description: "Learn from successful alumni founders", icon: "💡" },
    { title: "Cultural Evening", date: "2026-07-12", location: "Open Air Theater", description: "Celebrate art, music, and culture", icon: "🎭" },
    { title: "Healthcare Seminar", date: "2026-08-18", location: "Medical College", description: "Latest advances in healthcare", icon: "🏥" }
];

// Sample Achievements Data
const achievements = [
    { name: "Aditya Sharma", category: "sports", achievement: "Olympic Bronze Medalist", field: "Swimming", year: "2024", graduationYear: "2021", icon: "🏊" },
    { name: "Dr. Sneha Reddy", category: "academics", achievement: "Nobel Prize Nominee", field: "Physics", year: "2025", graduationYear: "2017", icon: "🏆" },
    { name: "Ravi Kumar", category: "social", achievement: "Community Hero Award", field: "Rural Education", year: "2024", graduationYear: "2019", icon: "🤝" },
    { name: "Priyanka Nair", category: "sports", achievement: "National Cricket Captain", field: "Cricket", year: "2023", graduationYear: "2018", icon: "🏏" },
    { name: "Prof. Suresh Iyer", category: "research", achievement: "Published in Nature", field: "Biotechnology", year: "2025", graduationYear: "2016", icon: "📚" },
    { name: "Anjali Desai", category: "entrepreneurship", achievement: "Forbes 30 Under 30", field: "Tech Startup", year: "2024", graduationYear: "2022", icon: "💼" },
    { name: "Karthik Menon", category: "sports", achievement: "Chess Grandmaster", field: "Chess", year: "2025", graduationYear: "2020", icon: "♟️" },
    { name: "Dr. Lakshmi Pillai", category: "academics", achievement: "IIT Best Researcher", field: "AI/ML", year: "2024", graduationYear: "2015", icon: "🎓" },
    { name: "Vivek Singh", category: "social", achievement: "Environmental Champion", field: "Climate Action", year: "2025", graduationYear: "2024", icon: "🌱" },
    { name: "Divya Krishnan", category: "arts", achievement: "National Film Award", field: "Documentary", year: "2024", graduationYear: "2020", icon: "🎬" }
];

// Sample Mentors Data
const mentors = [
    { name: "Rajesh Khanna", expertise: "Software Development", company: "Google", experience: "15 years", graduationYear: "2015", icon: "👨‍💻" },
    { name: "Pooja Mehta", expertise: "Medical Research", company: "WHO", experience: "12 years", graduationYear: "2016", icon: "👩‍⚕️" },
    { name: "Arjun Kapoor", expertise: "Investment Banking", company: "JP Morgan", experience: "10 years", graduationYear: "2017", icon: "👨‍💼" },
    { name: "Nisha Verma", expertise: "Data Science", company: "Amazon", experience: "8 years", graduationYear: "2018", icon: "👩‍💻" },
    { name: "Siddharth Rao", expertise: "Entrepreneurship", company: "Own Startup", experience: "14 years", graduationYear: "2019", icon: "👨‍💼" },
    { name: "Kavita Joshi", expertise: "Law & Policy", company: "Supreme Court", experience: "18 years", graduationYear: "2015", icon: "👩‍⚖️" }
];

// Sample Feedback Data
let feedbackData = [
    { author: "Alumni 2020", message: "This platform is amazing! Helped me connect with batchmates.", date: "2026-01-15" },
    { author: "Student", message: "Found a great mentorship opportunity through this portal.", date: "2026-01-20" },
    { author: "Alumni 2018", message: "The job listings section is very useful. Got referrals!", date: "2026-02-01" }
];

// =============== NETWORK ANALYSIS DATA ===============

// Connection Graph (adjacency list representation)
const connectionGraph = {
    0: [2, 5, 11], // Dr. Rajesh Kumar connections
    1: [13, 21],
    2: [0, 3, 9],
    3: [2, 14],
    4: [11, 23],
    5: [0, 6, 15],
    6: [5, 7],
    7: [6, 8, 18],
    8: [7, 9],
    9: [2, 8, 10],
    10: [9, 16],
    11: [0, 4, 12],
    12: [11, 17],
    13: [1, 14, 22],
    14: [3, 13, 19],
    15: [5, 16],
    16: [10, 15, 20],
    17: [12, 18],
    18: [7, 17, 24],
    19: [14, 25],
    20: [16, 21],
    21: [1, 20, 26],
    22: [13, 23],
    23: [4, 22, 27],
    24: [18, 28],
    25: [19, 29],
    26: [21, 27],
    27: [23, 26, 28],
    28: [24, 27, 29],
    29: [25, 28]
};

// Calculate network metrics
function calculateInfluenceScore(profileIndex) {
    const connections = connectionGraph[profileIndex] || [];
    const directConnections = connections.length;
    
    // Calculate reach (second-degree connections)
    let secondDegree = new Set();
    connections.forEach(conn => {
        const friendsOfFriend = connectionGraph[conn] || [];
        friendsOfFriend.forEach(fof => {
            if (fof !== profileIndex && !connections.includes(fof)) {
                secondDegree.add(fof);
            }
        });
    });
    
    // Influence score = direct + (indirect * 0.5) + activity bonus
    const profile = alumniProfiles[profileIndex];
    const activityBonus = profile.research ? 10 : 0;
    const score = (directConnections * 10) + (secondDegree.size * 5) + activityBonus;
    
    return Math.round(score);
}

// Community Detection using simple clustering
function detectCommunities() {
    const communities = {};
    
    alumniProfiles.forEach((profile, idx) => {
        const key = `${profile.stream}_${profile.year}`;
        if (!communities[key]) {
            communities[key] = [];
        }
        communities[key].push(idx);
    });
    
    return communities;
}

// Calculate betweenness centrality (simplified)
function calculateCentrality(profileIndex) {
    const connections = connectionGraph[profileIndex] || [];
    
    // Nodes with more connections are more central
    const degree = connections.length;
    const totalNodes = alumniProfiles.length;
    
    return ((degree / totalNodes) * 100).toFixed(1);
}

// Smart Mentorship Matching Algorithm
function getRecommendedMentors(userProfile) {
    const userStream = userProfile.stream;
    const userYear = parseInt(userProfile.year);
    
    const scores = mentors.map((mentor, idx) => {
        let score = 0;
        
        // Experience match (graduated 5+ years before)
        const mentorYear = parseInt(mentor.graduationYear);
        const yearDiff = userYear - mentorYear;
        if (yearDiff >= 5) score += 30;
        else if (yearDiff >= 3) score += 20;
        
        // Industry relevance
        if (mentor.expertise.toLowerCase().includes(userStream)) score += 25;
        
        // Network connections (if connected to mutual alumni)
        const userIdx = alumniProfiles.findIndex(p => p.email === userProfile.email);
        if (userIdx !== -1) {
            const userConnections = connectionGraph[userIdx] || [];
            const hasSharedConnections = userConnections.some(conn => {
                const connProfile = alumniProfiles[conn];
                return connProfile && connProfile.company === mentor.company;
            });
            if (hasSharedConnections) score += 20;
        }
        
        // Company prestige bonus
        const topCompanies = ['Google', 'Amazon', 'Microsoft', 'WHO', 'JP Morgan'];
        if (topCompanies.includes(mentor.company)) score += 15;
        
        return { mentor, score, index: idx };
    });
    
    return scores.sort((a, b) => b.score - a.score);
}

// Find influential alumni (high centrality)
function getKeyInfluencers(limit = 10) {
    const influencers = alumniProfiles.map((profile, idx) => ({
        profile,
        index: idx,
        influenceScore: calculateInfluenceScore(idx),
        centrality: calculateCentrality(idx)
    }));
    
    return influencers
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, limit);
}

// Network path finding (breadth-first search)
function findConnectionPath(startIdx, endIdx) {
    if (startIdx === endIdx) return [startIdx];
    
    const visited = new Set();
    const queue = [[startIdx]];
    
    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
        
        if (visited.has(node)) continue;
        visited.add(node);
        
        const neighbors = connectionGraph[node] || [];
        
        for (const neighbor of neighbors) {
            if (neighbor === endIdx) {
                return [...path, neighbor];
            }
            
            if (!visited.has(neighbor)) {
                queue.push([...path, neighbor]);
            }
        }
    }
    
    return null; // No path found
}

// Calculate network statistics
function getNetworkStats() {
    const totalAlumni = alumniProfiles.length;
    let totalConnections = 0;
    
    Object.values(connectionGraph).forEach(connections => {
        totalConnections += connections.length;
    });
    
    const avgConnections = (totalConnections / totalAlumni).toFixed(1);
    const communities = Object.keys(detectCommunities()).length;
    
    return {
        totalAlumni,
        totalConnections: totalConnections / 2, // Each connection counted twice
        avgConnections,
        communities,
        networkDensity: ((totalConnections / (totalAlumni * (totalAlumni - 1))) * 100).toFixed(2)
    };
}

// =============== DARK MODE ===============

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    // Update toggle button
    const toggleBtn = document.querySelector('.dark-mode-toggle');
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const toggleBtn = document.querySelector('.dark-mode-toggle');
    if (toggleBtn) toggleBtn.textContent = '☀️';
}

// =============== BOOKMARKS SYSTEM ===============

function getBookmarks() {
    const bookmarks = localStorage.getItem('bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : { profiles: [], jobs: [] };
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function toggleBookmark(type, index) {
    const bookmarks = getBookmarks();
    const key = type === 'profile' ? 'profiles' : 'jobs';
    
    if (bookmarks[key].includes(index)) {
        bookmarks[key] = bookmarks[key].filter(i => i !== index);
    } else {
        bookmarks[key].push(index);
    }
    
    saveBookmarks(bookmarks);
    
    // Update UI
    updateBookmarkButtons();
    if (document.getElementById('bookmarks').classList.contains('active')) {
        loadBookmarks();
    }
}

function updateBookmarkButtons() {
    const bookmarks = getBookmarks();
    
    // Update profile bookmarks
    document.querySelectorAll('[data-bookmark-type="profile"]').forEach(btn => {
        const index = parseInt(btn.dataset.bookmarkIndex);
        btn.classList.toggle('bookmarked', bookmarks.profiles.includes(index));
        btn.textContent = bookmarks.profiles.includes(index) ? '⭐' : '☆';
    });
    
    // Update job bookmarks
    document.querySelectorAll('[data-bookmark-type="job"]').forEach(btn => {
        const index = parseInt(btn.dataset.bookmarkIndex);
        btn.classList.toggle('bookmarked', bookmarks.jobs.includes(index));
        btn.textContent = bookmarks.jobs.includes(index) ? '⭐' : '☆';
    });
}

function loadBookmarks() {
    const bookmarks = getBookmarks();
    
    // Load bookmarked profiles
    const profilesContainer = document.getElementById('bookmarked-profiles');
    const profileCount = document.getElementById('bookmark-profile-count');
    
    if (bookmarks.profiles.length === 0) {
        profilesContainer.innerHTML = '<p class="empty-message">No bookmarked profiles yet. Click the ⭐ icon on any profile to save it here.</p>';
        profileCount.textContent = '0';
    } else {
        let html = '';
        bookmarks.profiles.forEach(index => {
            const profile = alumniProfiles[index];
            if (profile) {
                html += `
                    <div class="card" onclick="showProfileDetail(${index})" style="position: relative;">
                        <button class="bookmark-btn bookmarked" data-bookmark-type="profile" data-bookmark-index="${index}" onclick="event.stopPropagation(); toggleBookmark('profile', ${index})">⭐</button>
                        <div class="card-image">${profile.icon}</div>
                        <div class="card-body">
                            <h3>${profile.name}</h3>
                            <p><strong>${profile.position}</strong></p>
                            <p>${profile.company}</p>
                            ${profile.research ? '<p style="color: #008B8B; font-size: 0.85rem;">📄 Research Published</p>' : ''}
                            ${profile.lastActive ? `<p style="color: #999; font-size: 0.85rem;">🕐 Active ${profile.lastActive}</p>` : ''}
                            <span class="card-badge">${profile.stream}</span>
                            <span class="card-badge">Batch ${profile.year}</span>
                        </div>
                    </div>
                `;
            }
        });
        profilesContainer.innerHTML = html;
        profileCount.textContent = bookmarks.profiles.length;
    }
    
    // Load bookmarked jobs
    const jobsContainer = document.getElementById('bookmarked-jobs');
    const jobCount = document.getElementById('bookmark-job-count');
    
    if (bookmarks.jobs.length === 0) {
        jobsContainer.innerHTML = '<p class="empty-message">No bookmarked jobs yet. Click the ⭐ icon on any job to save it here.</p>';
        jobCount.textContent = '0';
    } else {
        let html = '';
        bookmarks.jobs.forEach(index => {
            const job = jobListings[index];
            if (job) {
                html += `
                    <div class="card" onclick="showJobDetail(${index})" style="position: relative;">
                        <button class="bookmark-btn bookmarked" data-bookmark-type="job" data-bookmark-index="${index}" onclick="event.stopPropagation(); toggleBookmark('job', ${index})">⭐</button>
                        <div class="card-image">${job.icon}</div>
                        <div class="card-body">
                            <h3>${job.title}</h3>
                            <p><strong>${job.company}</strong></p>
                            <p>📍 ${job.location}</p>
                            <p>💰 ${job.salary}</p>
                            <span class="card-badge">${job.type}</span>
                            <span class="card-badge">${job.domain}</span>
                        </div>
                    </div>
                `;
            }
        });
        jobsContainer.innerHTML = html;
        jobCount.textContent = bookmarks.jobs.length;
    }
}

// =============== SEARCH FUNCTIONALITY ===============

function searchProfiles() {
    const searchTerm = document.getElementById('profile-search').value.toLowerCase();
    const streamFilter = document.getElementById('stream-filter').value;
    const yearFilter = document.getElementById('year-filter').value;
    
    let filteredProfiles = alumniProfiles;
    
    // Apply search filter
    if (searchTerm) {
        filteredProfiles = filteredProfiles.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.company.toLowerCase().includes(searchTerm) ||
            p.position.toLowerCase().includes(searchTerm) ||
            (p.location && p.location.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply stream filter
    if (streamFilter !== 'all') {
        filteredProfiles = filteredProfiles.filter(p => p.stream === streamFilter);
    }
    
    // Apply year filter
    if (yearFilter !== 'all') {
        filteredProfiles = filteredProfiles.filter(p => p.year === yearFilter);
    }
    
    displayFilteredProfiles(filteredProfiles);
}

function displayFilteredProfiles(profiles) {
    const container = document.getElementById('profiles-grid');
    const bookmarks = getBookmarks();
    
    if (profiles.length === 0) {
        container.innerHTML = '<p class="empty-message">No profiles found matching your search criteria.</p>';
        return;
    }
    
    let html = '';
    profiles.forEach(profile => {
        const originalIndex = alumniProfiles.indexOf(profile);
        const isBookmarked = bookmarks.profiles.includes(originalIndex);
        
        html += `
            <div class="card" onclick="showProfileDetail(${originalIndex})" style="position: relative;">
                <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-type="profile" data-bookmark-index="${originalIndex}" onclick="event.stopPropagation(); toggleBookmark('profile', ${originalIndex})">${isBookmarked ? '⭐' : '☆'}</button>
                <div class="card-image">${profile.icon}</div>
                <div class="card-body">
                    <h3>${profile.name}</h3>
                    <p><strong>${profile.position}</strong></p>
                    <p>${profile.company}</p>
                    ${profile.research ? '<p style="color: #008B8B; font-size: 0.85rem;">📄 Research Published</p>' : ''}
                    ${profile.lastActive ? `<p style="color: #999; font-size: 0.85rem;">🕐 Active ${profile.lastActive}</p>` : ''}
                    <span class="card-badge">${profile.stream}</span>
                    <span class="card-badge">Batch ${profile.year}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// =============== NAVIGATION FUNCTIONS ===============

function navigate(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');
    
    // Load content based on section
    switch(sectionId) {
        case 'profiles':
            loadProfiles();
            break;
        case 'jobs':
            loadJobs();
            break;
        case 'events':
            loadEvents();
            break;
        case 'achievements':
            loadAchievements();
            break;
        case 'mentorship':
            loadMentors();
            break;
        case 'network':
            loadNetworkAnalytics();
            break;
        case 'bookmarks':
            loadBookmarks();
            break;
        case 'feedback':
            loadFeedback();
            break;
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============== LOGIN FUNCTIONS ===============

function showLogin() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('email-error').classList.remove('active');
}

function hideLogin() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('user-id').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('email-error').classList.remove('active');
    pendingAction = null;
}

function validateGitamEmail(email) {
    // Regex pattern for GITAM email domains
    const gitamPattern = /^[a-zA-Z0-9._%+-]+@(gitam\.in|gitam\.edu|student\.gitam\.edu)$/;
    return gitamPattern.test(email);
}

function handleLogin(event) {
    event.preventDefault();
    const userEmail = document.getElementById('user-id').value;
    const password = document.getElementById('user-password').value;
    const errorMsg = document.getElementById('email-error');
    
    // Check rate limiting
    const now = Date.now();
    if (loginAttempts.count >= loginAttempts.maxAttempts) {
        const timeSinceLast = now - loginAttempts.lastAttempt;
        if (timeSinceLast < loginAttempts.lockoutDuration) {
            const remaining = Math.ceil((loginAttempts.lockoutDuration - timeSinceLast) / 60000);
            alert(`⚠️ Too many login attempts. Please try again in ${remaining} minute(s).`);
            return;
        }
        // Reset after lockout period
        loginAttempts.count = 0;
    }
    
    // Validate GITAM email format
    if (!validateGitamEmail(userEmail)) {
        errorMsg.classList.add('active');
        loginAttempts.count++;
        loginAttempts.lastAttempt = now;
        return;
    }
    
    errorMsg.classList.remove('active');
    
    // Simple validation (Demo purposes)
    const validPassword = 'gitam123';
    
    if (password === validPassword) {
        isLoggedIn = true;
        currentUser = userEmail;
        loginAttempts.count = 0; // Reset on successful login
        
        // Start session timer
        resetSessionTimer();
        
        // Add activity listeners to reset timer
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, resetSessionTimer, { passive: true });
        });
        
        alert('✅ Login Successful! Welcome to Alumni Portal.');
        hideLogin();
        
        // Execute pending action if any
        if (pendingAction) {
            pendingAction();
            pendingAction = null;
        }
    } else {
        loginAttempts.count++;
        loginAttempts.lastAttempt = now;
        const remaining = loginAttempts.maxAttempts - loginAttempts.count;
        alert(`❌ Invalid password. ${remaining} attempt(s) remaining.\n\nDemo password: gitam123`);
    }
}

function checkLoginAndExecute(action) {
    if (!isLoggedIn) {
        pendingAction = action;
        showLogin();
        return false;
    }
    return true;
}

// =============== DATA LOADING FUNCTIONS ===============

function loadProfiles() {
    const container = document.getElementById('profiles-grid');
    const bookmarks = getBookmarks();
    let html = '';
    
    alumniProfiles.forEach((profile, index) => {
        const isBookmarked = bookmarks.profiles.includes(index);
        const influenceScore = calculateInfluenceScore(index);
        const centrality = calculateCentrality(index);
        const connections = (connectionGraph[index] || []).length;
        
        html += `
            <div class="card" onclick="showProfileDetail(${index})" style="position: relative;">
                <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-type="profile" data-bookmark-index="${index}" onclick="event.stopPropagation(); toggleBookmark('profile', ${index})">${isBookmarked ? '⭐' : '☆'}</button>
                <div class="card-image">${profile.icon}</div>
                <div class="card-body">
                    <h3>${profile.name}</h3>
                    <p><strong>${profile.position}</strong></p>
                    <p>${profile.company}</p>
                    ${profile.research ? '<p style="color: #008B8B; font-size: 0.85rem;">📄 Research Published</p>' : ''}
                    ${profile.lastActive ? `<p style="color: #999; font-size: 0.85rem;">🕐 Active ${profile.lastActive}</p>` : ''}
                    <p style="color: #00A896; font-size: 0.9rem; font-weight: 600;">🔗 ${connections} connections | 📊 Influence: ${influenceScore}</p>
                    <span class="card-badge">${profile.stream}</span>
                    <span class="card-badge">Batch ${profile.year}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showProfileDetail(index) {
    if (!checkLoginAndExecute(() => showProfileDetail(index))) return;
    
    const profile = alumniProfiles[index];
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-body-content');
    
    let html = `
        <div class="detail-header">
            <div class="detail-icon">${profile.icon}</div>
            <div class="detail-info">
                <h2>${profile.name}</h2>
                <p><strong>${profile.position}</strong> at ${profile.company}</p>
                <p>📍 ${profile.location} | 🎓 Batch of ${profile.year}</p>
            </div>
        </div>
        <div class="detail-body">
            <h3>About</h3>
            <p>${profile.bio}</p>
            
                    ${profile.lastActive ? `
                        <h3>Last Active</h3>
                        <p>🕐 ${profile.lastActive}</p>
                    ` : ''}
                    
            ${profile.research ? `
                <h3>📚 Research Publication</h3>
                <p><strong>${profile.research}</strong></p>
                <p style="color: #666; font-size: 0.9rem;">For more details about this research, please contact the alumni directly.</p>
            ` : ''}
            
            <h3>Contact</h3>
            <p>✉️ ${obfuscateEmail(profile.email)}</p>
        </div>
        <div class="detail-actions">
            <button class="btn-secondary" onclick="closeDetailModal()">Close</button>
            <button class="btn-primary" onclick="requestConnection('${profile.name}', '${profile.email}')">Connect</button>
        </div>
    `;
    
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

function requestConnection(name, email) {
    alert(`✅ Connection request sent to ${name}!\n\nYou can reach out at: ${email}`);
    closeDetailModal();
}

function loadJobs() {
    const container = document.getElementById('jobs-grid');
    const bookmarks = getBookmarks();
    let html = '';
    
    jobListings.forEach((job, index) => {
        const isBookmarked = bookmarks.jobs.includes(index);
        
        html += `
            <div class="card" onclick="showJobDetail(${index})" style="position: relative;">
                <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-type="job" data-bookmark-index="${index}" onclick="event.stopPropagation(); toggleBookmark('job', ${index})">${isBookmarked ? '⭐' : '☆'}</button>
                <div class="card-image">${job.icon}</div>
                <div class="card-body">
                    <h3>${job.title}</h3>
                    <p><strong>${job.company}</strong></p>
                    <p>📍 ${job.location}</p>
                    <p>💰 ${job.salary}</p>
                    <span class="card-badge">${job.type}</span>
                    <span class="card-badge">${job.domain}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showJobDetail(index) {
    if (!checkLoginAndExecute(() => showJobDetail(index))) return;
    
    const job = jobListings[index];
    alert(`📋 Job Details\n\nPosition: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nSalary: ${job.salary}\nType: ${job.type}\n\n✅ To apply, please login and contact the alumni network.`);
}

function loadEvents() {
    const container = document.getElementById('events-grid');
    let html = '';
    
    events.forEach((event, index) => {
        html += `
            <div class="card" onclick="showEventDetail(${index})">
                <div class="card-image">${event.icon}</div>
                <div class="card-body">
                    <h3>${event.title}</h3>
                    <p><strong>📅 ${event.date}</strong></p>
                    <p>📍 ${event.location}</p>
                    <p>${event.description}</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showEventDetail(index) {
    if (!checkLoginAndExecute(() => showEventDetail(index))) return;
    
    const event = events[index];
    const registerConfirm = confirm(`🎉 ${event.title}\n\n📅 Date: ${event.date}\n📍 Location: ${event.location}\n\n${event.description}\n\nWould you like to register for this event?`);
    
    if (registerConfirm) {
        alert('✅ Registration successful! You will receive confirmation email shortly.');
    }
}

function loadAchievements() {
    const container = document.getElementById('achievements-grid');
    let html = '';
    
    achievements.forEach((achievement, index) => {
        html += `
            <div class="card" onclick="showAchievementDetail(${index})">
                <div class="card-image">${achievement.icon}</div>
                <div class="card-body">
                    <h3>${achievement.name}</h3>
                    <p><strong>${achievement.achievement}</strong></p>
                    <p>${achievement.field}</p>
                    <p>Year: ${achievement.year}</p>
                    ${achievement.graduationYear ? `<span class="card-badge">Batch ${achievement.graduationYear}</span>` : ''}
                    <span class="card-badge">${achievement.category}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showAchievementDetail(index) {
    if (!checkLoginAndExecute(() => showAchievementDetail(index))) return;
    
    const achievement = achievements[index];
    const graduationInfo = achievement.graduationYear ? `\nGraduation Batch: ${achievement.graduationYear}` : '';
    alert(`🏆 Achievement Details\n\nName: ${achievement.name}\nAchievement: ${achievement.achievement}\nField: ${achievement.field}\nYear: ${achievement.year}${graduationInfo}\nCategory: ${achievement.category}`);
}

function loadMentors() {
    const container = document.getElementById('mentors-grid');
    let html = '';
    
    mentors.forEach((mentor, index) => {
        html += `
            <div class="card">
                <div class="card-image">${mentor.icon}</div>
                <div class="card-body">
                    <h3>${mentor.name}</h3>
                    <p><strong>${mentor.expertise}</strong></p>
                    <p>${mentor.company}</p>
                    <p>Experience: ${mentor.experience}</p>
                    ${mentor.graduationYear ? `<span class="card-badge">Batch ${mentor.graduationYear}</span>` : ''}
                    <button class="btn-primary" style="margin-top: 1rem;" onclick="event.stopPropagation(); requestMentorship(${index})">Request Mentorship</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function requestMentorship(mentorIndex) {
    if (!checkLoginAndExecute(() => requestMentorship(mentorIndex))) return;
    
    const mentor = mentors[mentorIndex];
    const modal = document.getElementById('mentorship-modal');
    const messageBox = document.getElementById('mentorship-message');
    
    // Generate introduction message template
    const userName = currentUser ? currentUser.split('@')[0].replace('.', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Student';
    
    // Calculate match score
    const userProfile = alumniProfiles.find(p => p.email === currentUser) || { stream: 'engineering', year: '2025' };
    const recommendations = getRecommendedMentors(userProfile);
    const matchInfo = recommendations.find(r => r.index === mentorIndex);
    const matchScore = matchInfo ? matchInfo.score : 50;
    
    const introMessage = `Dear ${mentor.name},

I hope this message finds you well. My name is ${userName}, and I am reaching out through the GITAM Alumni Association Portal.

I am deeply interested in ${mentor.expertise} and noticed your impressive background at ${mentor.company}. With your ${mentor.experience} of experience in the field, I believe your guidance would be invaluable to my career development.

✨ Our algorithm shows a ${matchScore}% mentorship compatibility based on industry overlap, network connections, and career trajectory.

I would be honored if you could mentor me and share your insights on:
- Industry best practices and trends
- Career growth strategies
- Technical skills development
- Networking and professional development

I am committed to making the most of this mentorship opportunity and would be flexible with your schedule for our interactions.

Thank you for considering my request. I look forward to the possibility of learning from your experience.

Best regards,
${userName}
${currentUser || 'yourname@gitam.edu'}`;
    
    messageBox.value = introMessage;
    modal.classList.add('active');
    
    // Store mentor info for sending
    window.currentMentorRequest = mentor;
}

function closeMentorshipModal() {
    document.getElementById('mentorship-modal').classList.remove('active');
    window.currentMentorRequest = null;
}

function sendMentorshipRequest() {
    const message = document.getElementById('mentorship-message').value;
    const mentor = window.currentMentorRequest;
    
    if (!mentor) {
        alert('⚠️ Invalid mentor selection.');
        return;
    }
    
    // Validate message length (50-2000 characters)
    if (!validateInput(message, 50, 2000)) {
        alert('⚠️ Message must be between 50 and 2000 characters.');
        return;
    }
    
    // Sanitize input
    const sanitized = sanitizeHTML(message);
    
    // Check for suspicious patterns (script tags, etc.)
    if (/<script|javascript:|onerror=/i.test(message)) {
        alert('⚠️ Invalid content detected in message.');
        return;
    }
    
    // Rate limit: 1 request per mentor per hour
    const requestKey = `mentor_request_${mentor.name}`;
    const lastRequest = sessionStorage.getItem(requestKey);
    const now = Date.now();
    
    if (lastRequest && (now - parseInt(lastRequest) < 60 * 60 * 1000)) {
        const remaining = Math.ceil((60 * 60 * 1000 - (now - parseInt(lastRequest))) / 60000);
        alert(`⚠️ Please wait ${remaining} minutes before sending another request to this mentor.`);
        return;
    }
    
    sessionStorage.setItem(requestKey, now.toString());
    
    alert(`✅ Mentorship request sent to ${mentor.name}!\n\nYour introduction has been forwarded. You will receive a response at ${currentUser} within 3-5 business days.`);
    closeMentorshipModal();
}

function loadFeedback() {
    const container = document.getElementById('feedback-container');
    let html = '';
    
    feedbackData.forEach(feedback => {
        html += `
            <div class="feedback-item">
                <div class="author">${feedback.author}</div>
                <div class="message">${feedback.message}</div>
                <div class="date">${feedback.date}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// =============== FILTER FUNCTIONS ===============

function filterProfiles() {
    searchProfiles(); // Use the new search function that handles all filtering
}

function filterJobs() {
    const domain = document.getElementById('job-domain-filter').value;
    const type = document.getElementById('job-type-filter').value;
    const bookmarks = getBookmarks();
    
    const container = document.getElementById('jobs-grid');
    let filteredJobs = jobListings;
    
    if (domain !== 'all') {
        filteredJobs = filteredJobs.filter(j => j.domain === domain);
    }
    
    if (type !== 'all') {
        filteredJobs = filteredJobs.filter(j => j.type === type);
    }
    
    let html = '';
    filteredJobs.forEach((job, index) => {
        const originalIndex = jobListings.indexOf(job);
        const isBookmarked = bookmarks.jobs.includes(originalIndex);
        
        html += `
            <div class="card" onclick="showJobDetail(${originalIndex})" style="position: relative;">
                <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-type="job" data-bookmark-index="${originalIndex}" onclick="event.stopPropagation(); toggleBookmark('job', ${originalIndex})">${isBookmarked ? '⭐' : '☆'}</button>
                <div class="card-image">${job.icon}</div>
                <div class="card-body">
                    <h3>${job.title}</h3>
                    <p><strong>${job.company}</strong></p>
                    <p>📍 ${job.location}</p>
                    <p>💰 ${job.salary}</p>
                    <span class="card-badge">${job.type}</span>
                    <span class="card-badge">${job.domain}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>No jobs found matching the filters.</p>';
}

function filterAchievements() {
    const category = document.getElementById('achievement-category-filter').value;
    
    const container = document.getElementById('achievements-grid');
    let filteredAchievements = achievements;
    
    if (category !== 'all') {
        filteredAchievements = filteredAchievements.filter(a => a.category === category);
    }
    
    let html = '';
    filteredAchievements.forEach((achievement, index) => {
        const originalIndex = achievements.indexOf(achievement);
        html += `
            <div class="card" onclick="showAchievementDetail(${originalIndex})">
                <div class="card-image">${achievement.icon}</div>
                <div class="card-body">
                    <h3>${achievement.name}</h3>
                    <p><strong>${achievement.achievement}</strong></p>
                    <p>${achievement.field}</p>
                    <p>Year: ${achievement.year}</p>
                    <span class="card-badge">${achievement.category}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>No achievements found matching the filter.</p>';
}

// =============== FEEDBACK SUBMISSION ===============

function submitFeedback() {
    const textarea = document.getElementById('feedback-textarea');
    const message = textarea.value.trim();
    
    // Validate input length (10-1000 characters)
    if (!validateInput(message, 10, 1000)) {
        alert('⚠️ Feedback must be between 10 and 1000 characters.');
        return;
    }
    
    // Sanitize HTML to prevent XSS
    const sanitized = sanitizeHTML(message);
    
    // Check for spam patterns
    if (containsSpam(sanitized)) {
        alert('⚠️ Your message appears to contain prohibited content. Please revise.');
        return;
    }
    
    // Rate limit: 1 submission per minute
    const lastSubmission = localStorage.getItem('lastFeedbackTime');
    const now = Date.now();
    if (lastSubmission && (now - parseInt(lastSubmission) < 60000)) {
        const remaining = Math.ceil((60000 - (now - parseInt(lastSubmission))) / 1000);
        alert(`⚠️ Please wait ${remaining} seconds before submitting another feedback.`);
        return;
    }
    
    localStorage.setItem('lastFeedbackTime', now.toString());
    
    const newFeedback = {
        author: 'Anonymous User',
        message: sanitized,
        date: new Date().toISOString().split('T')[0]
    };
    
    feedbackData.unshift(newFeedback);
    loadFeedback();
    textarea.value = '';
    alert('✅ Thank you for your feedback!');
}

// =============== NETWORK ANALYTICS FUNCTIONS ===============

function loadNetworkAnalytics() {
    loadNetworkStats();
    loadInfluencers();
    loadCommunities();
    loadPathFinderDropdowns();
}

function loadNetworkStats() {
    const stats = getNetworkStats();
    const container = document.getElementById('network-stats');
    
    const html = `
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">${stats.totalAlumni}</div>
            <div class="stat-label">Total Alumni</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🔗</div>
            <div class="stat-value">${stats.totalConnections}</div>
            <div class="stat-label">Network Connections</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">${stats.avgConnections}</div>
            <div class="stat-label">Avg Connections</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">${stats.communities}</div>
            <div class="stat-label">Communities</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-value">${stats.networkDensity}%</div>
            <div class="stat-label">Network Density</div>
        </div>
    `;
    
    container.innerHTML = html;
}

function loadInfluencers() {
    const influencers = getKeyInfluencers(9);
    const container = document.getElementById('influencers-grid');
    
    let html = '';
    influencers.forEach(({ profile, index, influenceScore, centrality }) => {
        const connections = (connectionGraph[index] || []).length;
        
        html += `
            <div class="card" onclick="showProfileDetail(${index})">
                <div class="card-image">${profile.icon}</div>
                <div class="card-body">
                    <h3>${profile.name}</h3>
                    <p><strong>${profile.position}</strong></p>
                    <p>${profile.company}</p>
                    <div style="margin: 1rem 0; padding: 1rem; background: linear-gradient(135deg, #E8F6F5, #F0F9FF); border-radius: 8px;">
                        <p style="color: #00A896; font-weight: 600; margin: 0.3rem 0;">
                            🌟 Influence Score: ${influenceScore}
                        </p>
                        <p style="color: #028090; font-weight: 600; margin: 0.3rem 0;">
                            📊 Centrality: ${centrality}%
                        </p>
                        <p style="color: #666; font-weight: 600; margin: 0.3rem 0;">
                            🔗 Connections: ${connections}
                        </p>
                    </div>
                    <span class="card-badge">${profile.stream}</span>
                    <span class="card-badge">Batch ${profile.year}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadCommunities() {
    const communities = detectCommunities();
    const container = document.getElementById('communities-container');
    
    let html = '';
    Object.entries(communities).forEach(([key, members]) => {
        const [stream, year] = key.split('_');
        const avgInfluence = members.reduce((sum, idx) => sum + calculateInfluenceScore(idx), 0) / members.length;
        
        html += `
            <div class="community-card">
                <h3>${stream.charAt(0).toUpperCase() + stream.slice(1)} - Batch ${year}</h3>
                <div class="community-stats">
                    <span>👥 ${members.length} members</span>
                    <span>📊 Avg Influence: ${Math.round(avgInfluence)}</span>
                </div>
                <div class="community-members">
                    ${members.slice(0, 5).map(idx => `
                        <span class="member-tag" onclick="showProfileDetail(${idx})">
                            ${alumniProfiles[idx].name}
                        </span>
                    `).join('')}
                    ${members.length > 5 ? `<span class="member-tag">+${members.length - 5} more</span>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadPathFinderDropdowns() {
    const startSelect = document.getElementById('path-start');
    const endSelect = document.getElementById('path-end');
    
    let options = '<option value="">Select alumni...</option>';
    alumniProfiles.forEach((profile, idx) => {
        options += `<option value="${idx}">${profile.name} - ${profile.company}</option>`;
    });
    
    startSelect.innerHTML = options;
    endSelect.innerHTML = options;
}

function findPath() {
    const startIdx = parseInt(document.getElementById('path-start').value);
    const endIdx = parseInt(document.getElementById('path-end').value);
    const resultDiv = document.getElementById('path-result');
    
    if (isNaN(startIdx) || isNaN(endIdx)) {
        alert('⚠️ Please select both alumni.');
        return;
    }
    
    if (startIdx === endIdx) {
        alert('⚠️ Please select different alumni.');
        return;
    }
    
    const path = findConnectionPath(startIdx, endIdx);
    
    if (!path) {
        resultDiv.innerHTML = '<p style="color: #d32f2f;">❌ No connection path found between these alumni.</p>';
        resultDiv.style.display = 'block';
        return;
    }
    
    let html = `
        <h3 style="color: #00A896; margin-bottom: 1rem;">✅ Connection Path Found (${path.length} steps)</h3>
        <div class="connection-path">
    `;
    
    path.forEach((idx, i) => {
        const profile = alumniProfiles[idx];
        html += `
            <div class="path-node">
                <div class="path-step">${i + 1}</div>
                <div class="path-info">
                    <strong>${profile.name}</strong>
                    <p>${profile.position} at ${profile.company}</p>
                </div>
            </div>
        `;
        
        if (i < path.length - 1) {
            html += '<div class="path-arrow">↓</div>';
        }
    });
    
    html += `
        </div>
        <p style="margin-top: 1rem; color: #666;">
            💡 These ${path.length - 1} connection${path.length - 1 > 1 ? 's' : ''} link the two alumni through their network.
        </p>
    `;
    
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
}

// =============== INITIALIZE ON PAGE LOAD ===============

window.onload = function() {
    // Load default content
    loadProfiles();
    loadJobs();
    loadEvents();
    loadAchievements();
    loadMentors();
    loadFeedback();
};
