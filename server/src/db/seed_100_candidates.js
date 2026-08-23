require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Aditya', 'Sneha', 'Vikram', 'Kavya', 'Rahul', 'Neha',
  'Siddharth', 'Divya', 'Varun', 'Meera', 'Karthik', 'Isha', 'Arjun', 'Pooja', 'Tanvi', 'Abhishek',
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Chris', 'David', 'Sarah', 'Elena', 'Lucas',
  'Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Mia',
  'Wei', 'Chen', 'Ming', 'Yuki', 'Kenji', 'Sakura', 'Taro', 'Hana', 'Haruto', 'Aoi',
  'Dev', 'Nisha', 'Akash', 'Shruti', 'Gautam', 'Riya', 'Aman', 'Swati', 'Manish', 'Simran',
  'Kabir', 'Anushka', 'Yash', 'Riddhi', 'Karan', 'Rhea', 'Pranav', 'Payal', 'Tushar', 'Saloni',
  'Mateo', 'Sofia', 'Santiago', 'Camila', 'Leonardo', 'Valeria', 'Diego', 'Lucia', 'Gabriel', 'Martina',
  'Nikhil', 'Tara', 'Rishi', 'Kriti', 'Harsh', 'Sanika', 'Dhruv', 'Bhavya', 'Ojas', 'Saniya',
  'Leo', 'Zoe', 'Felix', 'Chloe', 'Max', 'Maya', 'Julian', 'Clara', 'Adrian', 'Nina'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Rao', 'Kulkarni', 'Joshi', 'Shetty', 'Deshmukh', 'Gupta', 'Singh',
  'Nair', 'Iyer', 'Reddy', 'Chowdhury', 'Banerjee', 'Bhat', 'Hegde', 'Gowda', 'Kumar', 'Shah',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato'
];

const COLLEGES = [
  { name: 'KLE Technological University', city: 'Hubballi', state: 'Karnataka', country: 'India' },
  { name: 'Massachusetts Institute of Technology (MIT)', city: 'Cambridge', state: 'Massachusetts', country: 'USA' },
  { name: 'Stanford University', city: 'Stanford', state: 'California', country: 'USA' },
  { name: 'Indian Institute of Technology (IIT) Bombay', city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  { name: 'Indian Institute of Technology (IIT) Delhi', city: 'New Delhi', state: 'Delhi', country: 'India' },
  { name: 'Indian Institute of Science (IISc)', city: 'Bengaluru', state: 'Karnataka', country: 'India' },
  { name: 'BITS Pilani', city: 'Pilani', state: 'Rajasthan', country: 'India' },
  { name: 'RV College of Engineering', city: 'Bengaluru', state: 'Karnataka', country: 'India' },
  { name: 'National University of Singapore (NUS)', city: 'Singapore', state: 'Central', country: 'Singapore' },
  { name: 'Carnegie Mellon University', city: 'Pittsburgh', state: 'Pennsylvania', country: 'USA' },
  { name: 'University of Cambridge', city: 'Cambridge', state: 'Cambridgeshire', country: 'UK' },
  { name: 'ETH Zurich', city: 'Zurich', state: 'Zurich', country: 'Switzerland' },
];

const DOMAIN_PROFILES = [
  // 1. AI & Machine Learning
  {
    sector: 'AI & Machine Learning',
    degree: 'B.S. Artificial Intelligence & Data Science',
    bio: 'Passionate about deep learning, Computer Vision, and Transformer architectures. Currently building real-time object tracking models and fine-tuning LLMs.',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'Computer Vision', 'Natural Language Processing (NLP)', 'Scikit-Learn', 'Deep Learning', 'MLOps'],
    interests: ['Artificial Intelligence & Machine Learning', 'Data Science & Analytics', 'Computer Vision & Perception'],
    availabilityOptions: ['15-20 hrs/week', '20 hrs/week', '10-15 hrs/week'],
  },
  // 2. Fullstack & Web Development
  {
    sector: 'Full-Stack Web Development',
    degree: 'B.S. Computer Science & Engineering',
    bio: 'Fullstack developer focused on modern React, Node.js, and TypeScript web architectures. Experienced in building responsive web applications and REST microservices.',
    skills: ['React.js', 'Node.js', 'TypeScript', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'GraphQL', 'Express.js', 'Docker'],
    interests: ['Full-Stack Web Development', 'Frontend Engineering', 'Backend Systems & Microservices'],
    availabilityOptions: ['15 hrs/week', '20 hrs/week', 'Flexible (10-20 hrs)'],
  },
  // 3. Mobile App Development
  {
    sector: 'Mobile App Development',
    degree: 'B.Tech Computer Science',
    bio: 'Cross-platform mobile developer building smooth iOS and Android applications with Flutter and React Native. Experienced in Firebase integration and state management.',
    skills: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'iOS Development', 'Android Development', 'Firebase', 'Dart'],
    interests: ['Mobile Application Development', 'UI/UX & Product Design', 'Cross-Platform Frameworks'],
    availabilityOptions: ['10-15 hrs/week', '15 hrs/week', '20 hrs/week'],
  },
  // 4. Cybersecurity & Ethical Hacking
  {
    sector: 'Cybersecurity & Ethical Hacking',
    degree: 'B.S. Information Security',
    bio: 'Cybersecurity researcher specializing in penetration testing, network defense, Wireshark traffic analysis, and CTF challenges.',
    skills: ['Penetration Testing', 'Network Security', 'Wireshark', 'Metasploit', 'Linux', 'Cryptography', 'Python', 'Ethical Hacking'],
    interests: ['Cybersecurity & Ethical Hacking', 'Cloud Infrastructure & DevOps', 'Network Architecture'],
    availabilityOptions: ['12-15 hrs/week', '15 hrs/week', '20 hrs/week'],
  },
  // 5. UI/UX & Product Design
  {
    sector: 'UI/UX & Product Design',
    degree: 'B.Des Interaction & UX Design',
    bio: 'Product designer passionate about intuitive user experiences, design systems, interactive prototypes, and usability testing.',
    skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Adobe XD', 'User Testing'],
    interests: ['UI/UX & Product Design', 'Digital Product Strategy', 'Frontend Engineering'],
    availabilityOptions: ['10 hrs/week', '15 hrs/week', 'Flexible'],
  },
  // 6. Cloud & DevOps Engineering
  {
    sector: 'Cloud & DevOps Engineering',
    degree: 'B.S. Cloud Computing & Systems',
    bio: 'DevOps enthusiast building automated CI/CD pipelines, Docker containerized clusters, and infrastructure-as-code with Terraform on AWS.',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD Pipelines', 'Linux', 'Python', 'Bash Scripting'],
    interests: ['Cloud Infrastructure & DevOps', 'Backend Systems & Microservices', 'Cybersecurity & Ethical Hacking'],
    availabilityOptions: ['15-20 hrs/week', '20 hrs/week', '15 hrs/week'],
  },
  // 7. Blockchain & Web3
  {
    sector: 'Blockchain & Web3 Technologies',
    degree: 'B.S. Computer Science & Distributed Systems',
    bio: 'Web3 developer building decentralized smart contracts in Solidity and Rust. Experienced in Hardhat testing, Ethereum dApps, and DeFi protocols.',
    skills: ['Solidity', 'Ethereum', 'Smart Contracts', 'Rust', 'Web3.js', 'Hardhat', 'Cryptography'],
    interests: ['Blockchain & Web3 Technologies', 'Financial Tech & Algorithmic Trading', 'Cybersecurity & Ethical Hacking'],
    availabilityOptions: ['10-15 hrs/week', '15 hrs/week', '20 hrs/week'],
  },
  // 8. Data Science & Big Data
  {
    sector: 'Data Science & Big Data',
    degree: 'B.S. Statistics & Data Analytics',
    bio: 'Data scientist analyzing large datasets with Pandas, R, and SQL. Skilled in building interactive dashboards with Tableau and Power BI.',
    skills: ['R', 'Pandas', 'SQL', 'Tableau', 'Power BI', 'Data Visualization', 'Apache Spark', 'Python'],
    interests: ['Data Science & Analytics', 'Artificial Intelligence & Machine Learning', 'Financial Tech & Algorithmic Trading'],
    availabilityOptions: ['12 hrs/week', '15 hrs/week', '20 hrs/week'],
  },
  // 9. Mechanical & Robotics Engineering
  {
    sector: 'Robotics & Automation',
    degree: 'B.E. Mechanical & Robotics Engineering',
    bio: 'Mechatronics engineer designing autonomous robotic manipulators, SolidWorks 3D CAD models, and ROS robot controllers.',
    skills: ['SolidWorks', 'CAD/CAM', 'ROS (Robot Operating System)', 'MATLAB', 'Finite Element Analysis', 'Embedded C', 'Mechatronics'],
    interests: ['Robotics & Automation', 'Mechanical & Structural Design', 'Internet of Things (IoT)'],
    availabilityOptions: ['15 hrs/week', '20 hrs/week', '10-15 hrs/week'],
  },
  // 10. Electrical & Embedded Systems / IoT
  {
    sector: 'Internet of Things & Embedded Systems',
    degree: 'B.Tech Electrical & Electronics Engineering',
    bio: 'Embedded hardware developer building smart IoT sensor nodes with ESP32, Arduino, microcontrollers, and custom PCB designs.',
    skills: ['Arduino', 'Raspberry Pi', 'PCB Design', 'Verilog', 'Microcontrollers', 'C++', 'IoT Protocols'],
    interests: ['Internet of Things (IoT)', 'Embedded Systems & VLSI', 'Robotics & Automation'],
    availabilityOptions: ['10-15 hrs/week', '15 hrs/week', '20 hrs/week'],
  },
  // 11. Biotech & Biomedical Engineering
  {
    sector: 'Biotechnology & Medical Devices',
    degree: 'B.S. Biomedical Engineering',
    bio: 'Biomedical researcher analyzing genomic sequence data and designing non-invasive medical diagnostics tools.',
    skills: ['Bioinformatics', 'CRISPR', 'Gene Editing', 'Medical Device Design', 'Python', 'MATLAB', 'Lab Analysis'],
    interests: ['Biotechnology & Genetic Engineering', 'HealthTech & Medical Devices', 'Data Science & Analytics'],
    availabilityOptions: ['10 hrs/week', '15 hrs/week', 'Flexible'],
  },
  // 12. Business, Product & Fintech
  {
    sector: 'Digital Product & Fintech Strategy',
    degree: 'B.B.A. Finance & Product Management',
    bio: 'Product manager and financial analyst driving product strategy, user journey mapping, Agile sprints, and financial modeling.',
    skills: ['Product Strategy', 'Agile/Scrum', 'Financial Modeling', 'Business Analytics', 'Digital Marketing', 'A/B Testing'],
    interests: ['Digital Product Strategy', 'Financial Tech & Algorithmic Trading', 'Entrepreneurship & Startup Growth'],
    availabilityOptions: ['10-15 hrs/week', '15 hrs/week', '20 hrs/week'],
  },
];

const YEAR_OF_STUDY_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate / Master\'s'];

async function seed100Candidates() {
  console.log('🌱 Starting 100 Sample Candidate Students Seeding Process...\n');

  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Fetch skill ID map from database
    const skillsRes = await query(`SELECT id, name FROM skills`);
    const skillMap = new Map();
    skillsRes.rows.forEach((s) => skillMap.set(s.name.toLowerCase(), s.id));

    // Helper to get or insert skill ID
    const getOrInsertSkillId = async (skillName) => {
      const lower = skillName.toLowerCase();
      if (skillMap.has(lower)) return skillMap.get(lower);

      const insRes = await query(
        `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [skillName]
      );
      const newId = insRes.rows[0].id;
      skillMap.set(lower, newId);
      return newId;
    };

    // 2. Fetch interest ID map from database
    const interestsRes = await query(`SELECT id, name FROM interests`);
    const interestMap = new Map();
    interestsRes.rows.forEach((i) => interestMap.set(i.name.toLowerCase(), i.id));

    // Helper to get or insert interest ID
    const getOrInsertInterestId = async (interestName) => {
      const lower = interestName.toLowerCase();
      if (interestMap.has(lower)) return interestMap.get(lower);

      const insRes = await query(
        `INSERT INTO interests (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [interestName]
      );
      const newId = insRes.rows[0].id;
      interestMap.set(lower, newId);
      return newId;
    };

    let insertedCount = 0;

    // Loop to insert 100 candidate students
    for (let i = 1; i <= 100; i++) {
      const fn = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
      const name = `${fn} ${ln}`;
      const email = `candidate_student_${i}_${Date.now()}@university.edu`;

      const domain = DOMAIN_PROFILES[(i - 1) % DOMAIN_PROFILES.length];
      const collegeObj = COLLEGES[(i - 1) % COLLEGES.length];
      const yearOfStudy = YEAR_OF_STUDY_OPTIONS[(i - 1) % YEAR_OF_STUDY_OPTIONS.length];
      const availability = domain.availabilityOptions[(i - 1) % domain.availabilityOptions.length];

      // Insert User record
      const uRes = await query(
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
        [name, email, passwordHash]
      );
      const userId = uRes.rows[0].id;

      // Clean github / linkedin handle
      const handle = `${fn.toLowerCase()}_${ln.toLowerCase()}_${i}`;
      const githubUrl = `https://github.com/${handle}`;
      const linkedinUrl = `https://linkedin.com/in/${handle}`;

      // Insert Student Profile record
      await query(
        `INSERT INTO student_profiles 
         (user_id, college, city, state, country, degree, year_of_study, bio, availability, github_url, linkedin_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          collegeObj.name,
          collegeObj.city,
          collegeObj.state,
          collegeObj.country,
          domain.degree,
          yearOfStudy,
          domain.bio,
          availability,
          githubUrl,
          linkedinUrl,
        ]
      );

      // Insert Verification Status (80% VERIFIED, 20% UNVERIFIED)
      const verStatus = i % 5 === 0 ? 'UNVERIFIED' : 'VERIFIED';
      await query(
        `INSERT INTO student_verifications (user_id, status, method, verified_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, verStatus, 'COLLEGE_EMAIL', verStatus === 'VERIFIED' ? new Date() : null]
      );

      // Attach Skills to Candidate Student
      for (const skillName of domain.skills) {
        const skillId = await getOrInsertSkillId(skillName);
        await query(
          `INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, skillId]
        );
      }

      // Attach Interests to Candidate Student
      for (const interestName of domain.interests) {
        const interestId = await getOrInsertInterestId(interestName);
        await query(
          `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, interestId]
        );
      }

      insertedCount++;
    }

    console.log(`\n✅ SUCCESSFULLY SEEDED ${insertedCount} SAMPLE STUDENT CANDIDATES!`);

    const totalUsers = await query(`SELECT COUNT(*)::int as count FROM users`);
    const totalProfiles = await query(`SELECT COUNT(*)::int as count FROM student_profiles`);

    console.log(`📊 Total Registered Users in DB: ${totalUsers.rows[0].count}`);
    console.log(`📊 Total Student Profiles in DB: ${totalProfiles.rows[0].count}`);

    console.log('\n🎉 SEEDING COMPLETE! 100 Candidates across 12 sectors are ready for AI Match Engine queries.\n');
  } catch (error) {
    console.error('❌ Error during 100 candidates seeding:', error);
  } finally {
    process.exit(0);
  }
}

seed100Candidates();
