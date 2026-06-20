import type { Translations } from './types'

export const en: Translations = {
  langSwitcher: { ariaLabel: 'Switch to Portuguese' },

  nav: [
    { id: 'about', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'contact', label: 'Contact' },
  ],

  hero: {
    role: 'Software Engineer · Backend & Cloud',
    tagline:
      'Software Engineer with 3+ years of experience in backend development in the banking industry, working on mission-critical systems that handle millions of daily transactions.',
    viewWork: 'View My Work',
    downloadResume: 'Download Resume',
    scroll: 'scroll',
    resumeUrl: '/resume/en/Alessandro_Bezerra_Java_Backend_Engineer.pdf',
    location: 'Brazil · Remote',
  },

  about: {
    eyebrow: '01 — About',
    title: 'Who I Am',
    paragraphs: [
      'Software Engineer with 3+ years of experience in backend development in the banking industry, building mission-critical systems that handle millions of daily transactions.',
      'Experienced in Java, Spring Framework, REST APIs, and Apache Tomcat — developing, maintaining, and evolving enterprise applications focused on reliability, performance, and maintainability.',
      'Hands-on with microservices, distributed systems, Clean Architecture, AWS, CI/CD, and production incident handling. This portfolio puts those in practice: React on S3 + CloudFront, serverless backend with Lambda and DynamoDB, provisioned with Terraform.',
    ],
    skillsLabel: 'Core Skills',
    skills: [
      'Java',
      'Spring Boot',
      'Spring Framework',
      'REST APIs',
      'AWS',
      'TypeScript',
      'React',
      'PostgreSQL',
      'Microservices',
      'Distributed Systems',
      'Clean Architecture',
      'CI/CD',
      'TDD',
      'SQL',
      'Docker',
    ],
  },

  experience: {
    eyebrow: '02 — Experience',
    title: "Where I've Worked",
    items: [
      {
        company: 'Bradesco',
        role: 'Software Engineer',
        period: 'Jun 2021 — Sep 2024',
        location: 'São Paulo, Brazil',
        description:
          'Developed and maintained enterprise applications for one of Brazil\'s largest banks, in high-availability environments processing millions of daily transactions.',
        highlights: [
          'Built and maintained enterprise applications using Java, Spring Framework (Spring MVC), JSP, Maven, and Apache Tomcat in high-availability banking environments.',
          'Developed and maintained REST APIs, integrations between critical systems, and SQL queries for enterprise applications, including legacy COBOL systems.',
          'Built an optimization that cut customer data lookup time by around 30%.',
          'Handled production incidents — troubleshooting, debugging, log analysis, and root cause analysis in critical systems.',
          'Worked on legacy system modernization, improving stability, performance, and reducing tech debt.',
          'Worked with Git, Gitflow, CI/CD pipelines, and Agile methodologies using Scrum.',
        ],
        stack: [
          'Java',
          'Spring MVC',
          'REST APIs',
          'SQL',
          'JSP',
          'Maven',
          'Apache Tomcat',
          'COBOL',
          'CI/CD',
          'Scrum',
        ],
      },
    ],
  },

  projects: {
    eyebrow: '03 — Projects',
    title: "Things I've Built",
    featuredLabel: 'Featured',
    tryItLabel: 'Try it',
    expandLabel: 'Expand',
    collapseLabel: 'Close',
    showcaseLabel: 'Showcase',
    showcaseItems: [
      {
        title: 'Bank Simulator',
        subtitle: 'Full-Stack Banking Platform',
        year: 'Apr 2026',
        description:
          'Bank Simulator is a full-stack banking platform built to explore real-world backend architecture, secure transaction handling, and clean design principles.\n\nThe backend is written in Java + Spring, organized in a layered Clean Architecture (Application, Domain, and Infrastructure layers). It handles ACID-guaranteed transactions, RSA cryptography per account — public key stored in the database, private key kept in memory — JWT and Google OAuth authentication, email verification flows, and integration with external services via AWS Secrets Manager. The database layer uses raw JDBC with no ORM, running on PostgreSQL for production and H2 in-memory for automated tests following TDD.\n\nThe frontend, built with React + TypeScript, covers an account dashboard, transaction history, balance visualization, and an asset marketplace interface fully connected to the backend APIs.',
        stack: ['Java', 'Spring', 'JDBC', 'PostgreSQL', 'React', 'TypeScript', 'AWS', 'TDD'],
        videoUrl: '/showcase/video/RareLines.mp4',
        aspectRatio: '16 / 9',
        liveUrl: 'https://app.alessandro-bezerra.me/',
        repoUrl: 'https://github.com/Narvaal/BankSimulator',
      },
      {
        title: 'MyLittleLab',
        subtitle: 'Particle Simulation',
        year: 'May 2025',
        description:
          'MyLittleLab is an interactive particle simulation built to explore how simple rules can generate complex and organic behaviors. The project was inspired by the work Cluster, by Jeffrey Ventrella, and uses concepts from emergent systems to create a kind of virtual ecosystem where thousands of particles interact with each other.\n\nOne of the biggest challenges during development was working with Three.js — particularly understanding how real-time rendering works and how to optimize the creation and update of thousands of elements simultaneously. A lot of thought went into performance, since this type of application needs to run well across different devices.\n\nTo address this, I implemented optimizations that adapt the experience according to the user\'s hardware. On mobile devices, the simulation automatically reduces the processing load by decreasing the number of particles and adjusting some calculations to maintain a good frame rate, while on more capable machines it delivers a more complete experience.\n\nThe goal was not only to create a beautiful visualization, but also to apply concepts of computer graphics, optimization, and modern web development using Three.js, Node.js, and frontend technologies.',
        stack: ['Three.js', 'Bootstrap', 'Node.js'],
        videoUrl: '/showcase/video/MyLittleLab.mp4',
        aspectRatio: '16 / 9',
        liveUrl: 'https://main.d37qx0ozmi9n89.amplifyapp.com/',
        repoUrl: 'https://github.com/Narvaal/Simulation',
        youtubeUrl: 'https://www.youtube.com/watch?v=m7UbT_fIBlw',
      },
      {
        title: "Erwin's Cat",
        subtitle: '3D Horror Game in Godot',
        year: 'Dec 2023',
        description:
          "This project was developed during a Game Jam with a horror theme, with the requirements of creating a game involving dinosaurs and time travel. It was one of my first game development projects and my first contact with the Godot engine, with an extremely limited deadline of just two weeks to build a complete experience.\n\nThe game is a 3D suspense experience where the player takes on the role of Alexandre Khalst, a biology professor trapped in a research facility belonging to a government organization. Without access to the outside world, the player must use a computer inside their cell to monitor cameras scattered around the environment and track dinosaurs through a temporal observation technology.\n\nOne of the biggest challenges during development was learning to build a complete 3D experience from scratch — including character movement, object interaction, environment creation, camera systems, UI, and gameplay logic. I also developed systems to control the dinosaurs, creating movement routes and behaviors that allowed the player to observe them and collect the information needed to advance the story.\n\nBeyond the technical side, I worked on building the player experience: crafting a horror atmosphere, objectives, narrative elements, and different paths leading to distinct endings. Even with the limited time, we managed to deliver a functional game with a complete gameplay loop, from exploration to objective resolution.\n\nThis project was a great opportunity to learn about game development — mainly how to turn an idea into an interactive experience through programming, systems design, and gameplay design.",
        stack: ['Godot', 'GDScript', '3D'],
        videoUrl: '/showcase/video/Erwins-cat.mp4',
        aspectRatio: '16 / 9',
        liveUrl: 'https://narvaaal.itch.io/erwins-cat',
      },
    ],
    items: [
      {
        title: 'Cloud Portfolio Platform',
        description:
          'The platform you\'re looking at — a production-grade, cloud-native portfolio built entirely on AWS. The frontend is a React + TypeScript SPA deployed on S3 and served globally via CloudFront. The backend is fully serverless: API Gateway routes requests to Lambda functions that handle contact form submissions and real-time visitor analytics, with data persisted in DynamoDB. The entire infrastructure is defined and provisioned as code with Terraform.',
        stack: ['React', 'TypeScript', 'AWS', 'Lambda', 'DynamoDB', 'Terraform', 'CloudFront', 'API Gateway'],
        repoUrl: 'https://github.com/Narvaal/cloud-portfolio-platform',
        featured: true,
      },
    ],
  },

  certifications: {
    eyebrow: '04 — Certifications',
    title: 'Credentials',
    verifyLabel: 'Verify credential',
    items: [
      {
        name: 'CS50: Introduction to Computer Science',
        issuer: 'Harvard University (edX)',
        year: 'Jun 2025',
        credentialUrl: 'https://courses.edx.org/certificates/5372cb10169d49a29a1d274575ec0b5c',
      },
      {
        name: 'Microsoft Certified: Azure Fundamentals (AZ-900)',
        issuer: 'Microsoft',
        year: 'Apr 2023',
        credentialUrl: 'https://www.credly.com/badges/274ad8ea-e6de-4c2b-b015-a68769947f31/linked_in_profile',
      },
      {
        name: 'Google Cloud Skills Boost',
        issuer: 'Google Cloud Platform',
        year: 'Oct 2022',
        credentialUrl: 'https://www.skills.google/public_profiles/0a6c6d1f-4521-4366-890e-54cc8525e653/badges/2699538',
      },
      {
        name: 'CCNA: Cisco Certified Network Associate',
        issuer: 'Cisco',
        year: 'Jan 2022',
        credentialUrl: 'https://www.credly.com/badges/33144cdd-c743-47ec-854e-1936f74ba82c/linked_in_profile',
      },
      {
        name: 'Introduction to Cybersecurity',
        issuer: 'Cisco',
        year: 'Nov 2021',
        credentialUrl: 'https://www.credly.com/badges/14da8e09-2d86-4717-b989-089ea20a0762/linked_in_profile',
      },
    ],
  },

  contact: {
    eyebrow: '05 — Contact',
    title: 'Get In Touch',
    description:
      'Have a role to discuss, a project to talk about, or just want to connect? Feel free to reach out.',
    availability:
      "I'm currently open to backend and cloud roles, especially around distributed systems, AWS, and clean architecture.",
    nameLabel: 'Name',
    emailLabel: 'Email',
    messageLabel: 'Message',
    send: 'Send Message',
    sending: 'Sending…',
    success: "Message sent! I'll be in touch soon.",
    error: 'Something went wrong. Please try again or email me directly.',
  },

  footer: {
    built: 'Built with React + AWS.',
    visitorsLabel: 'visitors',
  },

  github: {
    title: 'GitHub Activity',
    commits: 'Recent Commits',
    repos: 'Repositories',
    noActivity: 'No recent activity',
    starsLabel: 'stars',
  },
}
