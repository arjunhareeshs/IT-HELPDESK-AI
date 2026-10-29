/**
 * Campus Helpdesk Data
 * Predefined campus accounts, active triage tickets, and knowledge base.
 */

export const DEMO_USERS = [
  {
    id: 'user_student_01',
    role: 'student',
    roleLabel: 'Student',
    name: 'Alex Rivera',
    email: 'alex.student@campus.edu',
    title: 'Computer Science Sophomore',
    department: 'School of Engineering',
    avatarBg: '#8E1EA2',
    avatarInitials: 'AR',
    studentId: 'STU-98421',
    phone: '+1 (555) 234-8901',
    bio: 'Undergraduate student in Computer Science. Active in Robotics Club and Hackathon Team.',
    location: 'West Campus Residence Hall, Room 304'
  },
  {
    id: 'user_staff_01',
    role: 'staff',
    roleLabel: 'Staff',
    name: 'Sarah Jenkins',
    email: 'sarah.staff@campus.edu',
    title: 'Academic Affairs Coordinator',
    department: 'College of Arts & Sciences',
    avatarBg: '#C654C3',
    avatarInitials: 'SJ',
    staffId: 'STF-55209',
    phone: '+1 (555) 345-6712',
    bio: 'Coordinates faculty course scheduling, departmental IT resources, and classroom technology.',
    location: 'Administration Hall, Suite 210'
  },
  {
    id: 'user_tech_01',
    role: 'technician',
    roleLabel: 'IT Technician',
    name: 'Marcus Chen',
    email: 'marcus.tech@campus.edu',
    title: 'Senior Tier-2 Helpdesk Specialist',
    department: 'Campus IT Infrastructure & Network Services',
    avatarBg: '#7B198C',
    avatarInitials: 'MC',
    techId: 'TCH-80124',
    phone: '+1 (555) 456-7823',
    bio: 'Specialist in 802.1X enterprise wireless, Active Directory authentication, and hardware diagnostics.',
    location: 'IT Operations Center, Room 102'
  },
  {
    id: 'user_admin_01',
    role: 'admin',
    roleLabel: 'Administrator',
    name: 'Dr. Elena Rostova',
    email: 'elena.admin@campus.edu',
    title: 'Chief IT Operations Director',
    department: 'Enterprise Technology & Cybersecurity',
    avatarBg: '#4A0E4E',
    avatarInitials: 'ER',
    adminId: 'ADM-00101',
    phone: '+1 (555) 567-8934',
    bio: 'Oversees campus-wide enterprise systems, AI triage pipelines, SLA performance, and IT security.',
    location: 'Executive Computing Annex, Suite 400'
  }
];

export const INITIAL_TICKETS = [
  {
    id: 'TICK-1042',
    title: 'Wi-Fi 6 eduroam connection dropping in Library West',
    description: 'When moving between 2nd and 3rd floor reading rooms in Library West, MacBook disconnects from campus Wi-Fi and prompts for 802.1X certificate validation repeatedly.',
    category: 'Network & Wireless',
    priority: 'High',
    status: 'In Progress',
    creatorName: 'Alex Rivera',
    creatorEmail: 'alex.student@campus.edu',
    creatorRole: 'student',
    assignedTo: 'Marcus Chen',
    createdAt: '2026-10-29T08:30:00Z',
    aiTriage: {
      predictedCategory: 'Network & Wireless',
      confidence: 96.8,
      sentiment: 'Frustrated',
      recommendedUrgency: 'High',
      rootCause: 'AP Roaming Handshake Timeout (Aruba AP-555 AP handoff glitch on 5GHz)',
      suggestedFix: 'Advise student to forget network, re-download campus root CA profile v4.2, or force 5GHz preferred band.',
      autoRoutedTo: 'Marcus Chen (Tier-2 Network Services)'
    },
    activityNotes: [
      {
        id: 'act-1',
        author: 'Alex Rivera',
        role: 'student',
        timestamp: '2026-10-29T08:30:00Z',
        content: 'Reported constant disconnects on MacBook Pro (macOS Sonoma 14.5) in 3rd floor reading area.'
      },
      {
        id: 'act-2',
        author: 'AI Triage Engine',
        role: 'system',
        timestamp: '2026-10-29T08:30:02Z',
        content: 'Auto-triaged: High urgency due to AP Roaming Handshake timeout. Routed to Tier-2 wireless specialist Marcus Chen.'
      },
      {
        id: 'act-3',
        author: 'Marcus Chen',
        role: 'technician',
        timestamp: '2026-10-29T08:45:00Z',
        content: 'Investigating Aruba AirWave controller metrics. Pushed updated RADIUS roaming profile to Library West cluster.'
      }
    ]
  },
  {
    id: 'TICK-1043',
    title: 'Canvas LMS Gradebook Sync Timeout for Midterm Exams',
    description: 'Instructors report gradebook CSV export and Canvas-to-SIS synchronization times out after 60 seconds with 504 Gateway Error during peak grading periods.',
    category: 'Academic Software',
    priority: 'Critical',
    status: 'Open',
    creatorName: 'Sarah Jenkins',
    creatorEmail: 'sarah.staff@campus.edu',
    creatorRole: 'staff',
    assignedTo: 'Marcus Chen',
    createdAt: '2026-10-29T09:15:00Z',
    aiTriage: {
      predictedCategory: 'Academic Software',
      confidence: 94.2,
      sentiment: 'Urgent',
      recommendedUrgency: 'Critical',
      rootCause: 'SIS API Gateway Rate Limiter hit during simultaneous mid-term grade publishing batch.',
      suggestedFix: 'Temporarily scale SIS worker pods from 4 to 12 and extend NGINX proxy_read_timeout to 180s.',
      autoRoutedTo: 'Application Platforms Team'
    },
    activityNotes: [
      {
        id: 'act-1043-1',
        author: 'Sarah Jenkins',
        role: 'staff',
        timestamp: '2026-10-29T09:15:00Z',
        content: 'College of Arts & Sciences faculty reported 504 gateway timeout while exporting midterm grades.'
      },
      {
        id: 'act-1043-2',
        author: 'AI Triage Engine',
        role: 'system',
        timestamp: '2026-10-29T09:15:01Z',
        content: 'Priority escalated to Critical. Identified concurrent rate limiter throttling on SIS backend.'
      }
    ]
  },
  {
    id: 'TICK-1044',
    title: 'Engineering Lab 308 Workstation GPU Driver Kernel Crash',
    description: 'Workstations #12 and #14 in CAD design lab crash with BSOD "VIDEO_TDR_FAILURE (nvlddmkm.sys)" whenever Autodesk Maya or SolidWorks starts render viewport.',
    category: 'Hardware & Lab',
    priority: 'High',
    status: 'In Progress',
    creatorName: 'Alex Rivera',
    creatorEmail: 'alex.student@campus.edu',
    creatorRole: 'student',
    assignedTo: 'Marcus Chen',
    createdAt: '2026-10-28T14:20:00Z',
    aiTriage: {
      predictedCategory: 'Hardware & Lab',
      confidence: 98.1,
      sentiment: 'Neutral',
      recommendedUrgency: 'High',
      rootCause: 'Corrupt NVIDIA Studio Driver v560.81 conflicting with Windows 11 Enterprise 24H2 D3D runtime.',
      suggestedFix: 'Deploy silent DDU (Display Driver Uninstaller) cleanup script and push certified ODE driver v552.22 via SCCM.',
      autoRoutedTo: 'Marcus Chen (Hardware Specialist)'
    },
    activityNotes: [
      {
        id: 'act-1044-1',
        author: 'Alex Rivera',
        role: 'student',
        timestamp: '2026-10-28T14:20:00Z',
        content: 'CAD workstation BSOD crash occurred during senior design robotics lab session.'
      },
      {
        id: 'act-1044-2',
        author: 'Marcus Chen',
        role: 'technician',
        timestamp: '2026-10-28T15:10:00Z',
        content: 'Scheduled silent driver rollback script across all Lab 308 workstations.'
      }
    ]
  },
  {
    id: 'TICK-1045',
    title: 'Faculty Replacement Laptop Request — Lenovo ThinkPad P14s',
    description: 'Department chair approved replacement of 5-year-old Dell Latitude with standard engineering staff spec laptop with 32GB RAM and dual external monitor docking station.',
    category: 'Hardware Procurement',
    priority: 'Medium',
    status: 'Open',
    creatorName: 'Sarah Jenkins',
    creatorEmail: 'sarah.staff@campus.edu',
    creatorRole: 'staff',
    assignedTo: 'Hardware Logistics Team',
    createdAt: '2026-10-27T11:45:00Z',
    aiTriage: {
      predictedCategory: 'Hardware Procurement',
      confidence: 92.5,
      sentiment: 'Polite',
      recommendedUrgency: 'Medium',
      rootCause: 'Standard 4-year lifecycle hardware refresh.',
      suggestedFix: 'Verify asset tag #IT-77491 depreciation status and dispatch pre-imaged ThinkPad P14s Gen 5 from campus inventory.',
      autoRoutedTo: 'Hardware Asset Management'
    },
    activityNotes: [
      {
        id: 'act-1045-1',
        author: 'Sarah Jenkins',
        role: 'staff',
        timestamp: '2026-10-27T11:45:00Z',
        content: 'Submitted hardware procurement request with Dean approval attached.'
      }
    ]
  },
  {
    id: 'TICK-1046',
    title: 'Dormitory Ethernet Port 2B inactive in Maple Hall',
    description: 'Wall jack in Dorm 412 has no link light when connecting gaming console or laptop via Cat6 cable.',
    category: 'Network & Wireless',
    priority: 'Low',
    status: 'Resolved',
    creatorName: 'Alex Rivera',
    creatorEmail: 'alex.student@campus.edu',
    creatorRole: 'student',
    assignedTo: 'Marcus Chen',
    createdAt: '2026-10-26T16:00:00Z',
    aiTriage: {
      predictedCategory: 'Network & Wireless',
      confidence: 97.4,
      sentiment: 'Neutral',
      recommendedUrgency: 'Low',
      rootCause: 'Patch panel port #412-B was unpatched in IDF closet 4 during summer maintenance.',
      suggestedFix: 'Re-patch port to Cisco Catalyst 9300 switchport Gi1/0/28 with 802.1X student VLAN profile.',
      autoRoutedTo: 'Field Telecom Team'
    },
    activityNotes: [
      {
        id: 'act-1046-1',
        author: 'Alex Rivera',
        role: 'student',
        timestamp: '2026-10-26T16:00:00Z',
        content: 'Ethernet port has no green link LED.'
      },
      {
        id: 'act-1046-2',
        author: 'Marcus Chen',
        role: 'technician',
        timestamp: '2026-10-26T17:30:00Z',
        content: 'Re-patched port #412-B in Maple Hall 4th floor IDF closet. Gigabit link verified and tested.'
      }
    ]
  },
  {
    id: 'TICK-1047',
    title: 'Campus-wide Enterprise SSO SAML Certificate Expiration in 14 Days',
    description: 'Azure Active Directory federation metadata certificate for campus shibboleth IDP expires November 12, 2026. Needs rollover to prevent campus-wide lockout.',
    category: 'Security & Identity',
    priority: 'Critical',
    status: 'Open',
    creatorName: 'Dr. Elena Rostova',
    creatorEmail: 'elena.admin@campus.edu',
    creatorRole: 'admin',
    assignedTo: 'Identity & Access Mgmt',
    createdAt: '2026-10-29T07:00:00Z',
    aiTriage: {
      predictedCategory: 'Security & Identity',
      confidence: 99.3,
      sentiment: 'Technical Alert',
      recommendedUrgency: 'Critical',
      rootCause: 'Annual PKI key pair rotation schedule requirement.',
      suggestedFix: 'Upload secondary certificate into IdP federation XML and initiate staged rollover verification with LMS and Workday.',
      autoRoutedTo: 'IAM Security Operations'
    },
    activityNotes: [
      {
        id: 'act-1047-1',
        author: 'Dr. Elena Rostova',
        role: 'admin',
        timestamp: '2026-10-29T07:00:00Z',
        content: 'Initiated PKI certificate rollover plan for campus SSO authentication cluster.'
      }
    ]
  }
];

export const KNOWLEDGE_BASE_ARTICLES = [
  {
    id: 'KB-201',
    title: 'How to Connect to Campus "eduroam" Wi-Fi (iOS, Android, Windows & Mac)',
    category: 'Network',
    views: 14205,
    summary: 'Step-by-step setup guide for 802.1X enterprise wireless using your campus email credentials.'
  },
  {
    id: 'KB-202',
    title: 'Setting up Multi-Factor Authentication (MFA) via Microsoft Authenticator',
    category: 'Security',
    views: 8930,
    summary: 'Configure passwordless push notifications and backup codes for campus portal access.'
  },
  {
    id: 'KB-203',
    title: 'Accessing Campus Virtual Desktop Infrastructure (VDI) from Personal Devices',
    category: 'Software',
    views: 6512,
    summary: 'Run MATLAB, SolidWorks, and Adobe Creative Cloud remotely via VMware Horizon Client.'
  },
  {
    id: 'KB-204',
    title: 'Campus Student Printing Quota and PaperCut Mobile Print Setup',
    category: 'Hardware',
    views: 11420,
    summary: 'How to send print jobs from mobile or personal laptops to library release stations.'
  }
];

export const SYSTEM_METRICS = {
  activeTickets: 24,
  resolvedToday: 18,
  avgResponseTime: '3.4 mins',
  aiAccuracy: '96.2%',
  slaCompliance: '98.7%',
  satisfactionScore: '4.8 / 5.0'
};
