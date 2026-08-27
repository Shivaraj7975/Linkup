export const MELD_CATEGORIES = [
  { name: 'Gaming & Esports', desc: 'Esports squads, casual gaming, BGMI, Valorant, FIFA, LAN parties' },
  { name: 'Trips & Travel', desc: 'Weekend getaways, trekking, road trips, vacation groups, exploring' },
  { name: 'Sports & Fitness', desc: 'Football, cricket, basketball, badminton, gym & workout buddies' },
  { name: 'Music, Art & Creative', desc: 'Jamming & band, photography, filmmaking, design, content creation' },
  { name: 'Events & Hangouts', desc: 'Concerts, fest trips, movies, foodie meetups, campus hangouts' },
  { name: 'Web & Software Development', desc: 'Fullstack, web apps, frontend, backend, open source' },
  { name: 'Mobile App Development', desc: 'Flutter, React Native, iOS, Android development' },
  { name: 'AI, ML & Data Science', desc: 'Machine learning, deep learning, LLMs, data analytics' },
  { name: 'Hackathons & Competitions', desc: 'Hackathon teams, case competitions, coding contests' },
  { name: 'Cybersecurity & Ethical Hacking', desc: 'CTF challenges, ethical hacking, network security' },
  { name: 'Startups & Entrepreneurship', desc: 'Co-founder matching, pitch decks, business ideas' },
  { name: 'UI/UX & Product Design', desc: 'Figma, UI design, product prototyping, graphic design' },
  { name: 'Study & Exam Prep', desc: 'Group study, GATE/GRE/CAT prep, coding practice' },
  { name: 'Research & Academic', desc: 'Paper publishing, lab research, thesis projects' },
  { name: 'Other / Custom Meld', desc: 'Custom activities, interest groups, and specialized projects' },
];

export const CATEGORY_NAMES = MELD_CATEGORIES.map((c) => c.name);

export const DISCOVER_CATEGORIES = ['All Categories', ...CATEGORY_NAMES];
