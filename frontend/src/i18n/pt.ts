
import type { Translations } from './types'

export const pt: Translations = {
  langSwitcher: { ariaLabel: 'Mudar para inglês' },

  nav: [
    { id: 'about', label: 'Sobre' },
    { id: 'experience', label: 'Experiência' },
    { id: 'projects', label: 'Projetos' },
    { id: 'certifications', label: 'Certificações' },
    { id: 'contact', label: 'Contato' },
  ],

  hero: {
    role: 'Engenheiro de Software · Backend & Cloud',
    tagline:
      'Engenheiro de Software com 3+ anos de experiência em desenvolvimento backend no setor bancário, atuando em sistemas críticos de alta disponibilidade e grande volume transacional.',
    viewWork: 'Ver Projetos',
    downloadResume: 'Baixar Currículo',
    scroll: 'rolar',
    resumeUrl: '/resume/pt/Alessandro_Bezerra_Java_Backend_Engineer.pdf',
    location: 'Brasil · Remoto',
    openToWork: 'Disponível para Oportunidades',
  },

  about: {
    eyebrow: '01 — Sobre',
    title: 'Quem Sou',
    paragraphs: [
      'Engenheiro de Software com 3+ anos de experiência em desenvolvimento backend no setor bancário, construindo sistemas críticos que exigem alta disponibilidade e grande volume transacional.',
      'Experiência em Java, Spring Framework, APIs REST e Apache Tomcat — desenvolvendo, sustentando e evoluindo aplicações corporativas com foco em confiabilidade, performance e manutenibilidade.',
      'Vivência em arquitetura de microsserviços, sistemas distribuídos, Clean Architecture, AWS, CI/CD e resolução de incidentes em produção. Este portfólio é uma demonstração prática desses princípios: React no S3 + CloudFront, backend serverless com Lambda e DynamoDB, provisionado com Terraform.',
    ],
    skillsLabel: 'Principais Habilidades',
    skills: [
      'Java',
      'Spring Boot',
      'Spring Framework',
      'APIs REST',
      'AWS',
      'TypeScript',
      'React',
      'PostgreSQL',
      'Microsserviços',
      'Sistemas Distribuídos',
      'Clean Architecture',
      'CI/CD',
      'TDD',
      'SQL',
      'Docker',
    ],
  },

  experience: {
    eyebrow: '02 — Experiência',
    title: 'Onde Trabalhei',
    items: [
      {
        company: 'Bradesco',
        role: 'Analista de Sistemas | Backend Engineer',
        period: 'Jun 2021 — Set 2024',
        location: 'São Paulo, Brasil',
        description:
          'Desenvolvimento e sustentação de aplicações corporativas para um dos maiores bancos do Brasil, atuando em ambientes de alta disponibilidade e missão crítica com milhões de transações diárias.',
        highlights: [
          'Desenvolvimento e sustentação de aplicações corporativas utilizando Java, Spring Framework (Spring MVC), JSP, Maven e Apache Tomcat em ambiente bancário de alta disponibilidade.',
          'Desenvolvimento e manutenção de APIs REST, integrações entre sistemas críticos e consultas SQL em aplicações corporativas, incluindo sistemas legados em COBOL.',
          'Implementação de melhoria em sistema interno, reduzindo aproximadamente 30% do tempo de consulta de dados de clientes por meio de mecanismo de busca para otimização do fluxo operacional.',
          'Atuação em incidentes de produção — troubleshooting, debugging, análise de logs, monitoramento e análise de causa raiz em sistemas críticos.',
          'Participação em iniciativas de modernização de sistemas legados, contribuindo para melhoria da estabilidade, performance e manutenibilidade.',
          'Práticas de engenharia com Git, Gitflow, pipelines de CI/CD e metodologias ágeis com Scrum.',
        ],
        stack: [
          'Java',
          'Spring MVC',
          'APIs REST',
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
    eyebrow: '03 — Projetos',
    title: 'O Que Construí',
    featuredLabel: 'Destaque',
    tryItLabel: 'Testar',
    expandLabel: 'Expandir',
    collapseLabel: 'Fechar',
    showcaseLabel: 'Showcase',
    showcaseItems: [
      {
        title: 'Bank Simulator',
        subtitle: 'Plataforma Bancária Full-Stack',
        year: 'Abr 2026',
        description:
          'Bank Simulator é uma plataforma bancária full-stack desenvolvida para explorar arquitetura backend real, controle seguro de transações e boas práticas de design de software.\n\nO backend foi construído com Java + Spring, organizado em uma arquitetura em camadas inspirada na Clean Architecture (Application, Domain e Infrastructure). Inclui transações com garantias ACID, criptografia RSA por conta — chave pública armazenada no banco e chave privada mantida em memória — autenticação JWT e Google OAuth, fluxos de verificação de e-mail e integração com serviços externos via AWS Secrets Manager. A camada de banco usa JDBC puro, sem ORM, com PostgreSQL em produção e H2 em memória para testes automatizados seguindo TDD.\n\nO frontend, desenvolvido com React + TypeScript, abrange dashboard de conta, histórico de transações, visualização de saldo e uma interface de mercado de ativos totalmente conectada às APIs do backend.',
        stack: ['Java', 'Spring', 'JDBC', 'PostgreSQL', 'React', 'TypeScript', 'AWS', 'TDD'],
        videoUrl: '/showcase/video/RareLines.mp4',
        aspectRatio: '16 / 9',
        liveUrl: 'https://app.alessandro-bezerra.me/',
        repoUrl: 'https://github.com/Narvaal/BankSimulator',
      },
      {
        title: 'MyLittleLab',
        subtitle: 'Simulação de Partículas',
        year: 'Mai 2025',
        description:
          'O MyLittleLab é uma simulação de partículas interativa desenvolvida para explorar como regras simples podem gerar comportamentos complexos e orgânicos. O projeto foi inspirado no trabalho Cluester, de Jeffrey Ventrella, e utiliza conceitos de sistemas emergentes para criar uma espécie de ecossistema virtual onde milhares de partículas interagem entre si.\n\nDurante o desenvolvimento, um dos maiores desafios foi trabalhar com o Three.js, principalmente entender como funciona a renderização em tempo real e como otimizar a criação e atualização de milhares de elementos simultaneamente. Foi necessário pensar bastante em performance, já que uma aplicação desse tipo precisa rodar bem em diferentes dispositivos.\n\nPara isso, implementei otimizações para adaptar a experiência conforme o hardware do usuário. Por exemplo, em dispositivos móveis a simulação reduz automaticamente a carga de processamento, diminuindo a quantidade de partículas e ajustando alguns cálculos para manter uma boa taxa de FPS, enquanto em computadores com mais capacidade ela consegue entregar uma experiência mais completa.\n\nO objetivo do projeto foi não apenas criar uma visualização bonita, mas também aplicar conceitos de computação gráfica, otimização e desenvolvimento web moderno usando Three.js, Node.js e tecnologias de frontend.',
        stack: ['Three.js', 'Bootstrap', 'Node.js'],
        videoUrl: '/showcase/video/MyLittleLab.mp4',
        aspectRatio: '16 / 9',
        liveUrl: 'https://main.d37qx0ozmi9n89.amplifyapp.com/',
        repoUrl: 'https://github.com/Narvaal/Simulation',
        youtubeUrl: 'https://www.youtube.com/watch?v=m7UbT_fIBlw',
      },
      {
        title: "Erwin's Cat",
        subtitle: 'Jogo de Terror 3D em Godot',
        year: 'Dez 2023',
        description:
          'Este projeto foi desenvolvido durante uma Game Jam com o tema de terror, envolvendo os requisitos de criar um jogo com dinossauros e viagem no tempo. Foi um dos meus primeiros projetos em desenvolvimento de jogos e meu primeiro contato com a engine Godot, com um prazo extremamente limitado de apenas duas semanas para desenvolver uma experiência completa.\n\nO jogo é uma experiência 3D de suspense onde o jogador assume o papel de Alexandre Khalst, um professor de biologia preso em uma instalação de pesquisa de uma organização governamental. Sem acesso ao mundo exterior, o jogador precisa utilizar um computador dentro da cela para monitorar câmeras espalhadas pelo ambiente e acompanhar dinossauros através de uma tecnologia de observação temporal.\n\nDurante o desenvolvimento, um dos maiores desafios foi aprender a construir uma experiência 3D completa do zero, incluindo movimentação do personagem, interação com objetos, criação do ambiente, sistema de câmeras, interface e lógica de gameplay. Também desenvolvi sistemas para controlar os dinossauros, criando rotas de movimentação e comportamentos que permitissem ao jogador observar e coletar informações necessárias para avançar na história.\n\nAlém da parte técnica, trabalhei na construção da experiência do jogador, criando uma ambientação de terror, objetivos, elementos narrativos e diferentes caminhos que levam a finais distintos. Mesmo com o tempo limitado, conseguimos entregar um jogo funcional, com uma experiência completa de gameplay, desde exploração até resolução de objetivos.\n\nEsse projeto foi uma grande oportunidade de aprender sobre desenvolvimento de jogos, principalmente sobre como transformar uma ideia em uma experiência interativa utilizando programação, criação de sistemas e design de gameplay.',
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
          'A própria plataforma que você está vendo — um portfólio cloud-native de nível produção, construído inteiramente na AWS. O frontend é uma SPA em React + TypeScript hospedada no S3 e distribuída globalmente via CloudFront. O backend é totalmente serverless: API Gateway direciona as requisições para funções Lambda que processam o formulário de contato e analytics de visitantes em tempo real, com dados persistidos no DynamoDB. Toda a infraestrutura é definida e provisionada como código com Terraform.',
        stack: ['React', 'TypeScript', 'AWS', 'Lambda', 'DynamoDB', 'Terraform', 'CloudFront', 'API Gateway'],
        repoUrl: 'https://github.com/Narvaal/cloud-portfolio-platform',
        featured: true,
      },
    ],
  },

  certifications: {
    eyebrow: '04 — Certificações',
    title: 'Credenciais',
    verifyLabel: 'Verificar credencial',
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
        year: 'Abr 2023',
        credentialUrl: 'https://www.credly.com/badges/274ad8ea-e6de-4c2b-b015-a68769947f31/linked_in_profile',
      },
      {
        name: 'Google Cloud Skills Boost',
        issuer: 'Google Cloud Platform',
        year: 'Out 2022',
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
    eyebrow: '05 — Contato',
    title: 'Entre em Contato',
    description:
      'Se você tem uma vaga para discutir, um projeto em mente ou apenas quer se conectar — estou disponível.',
    availability:
      'Estou aberto a oportunidades de engenharia backend e cloud, especialmente em projetos que trabalham na interseção de sistemas distribuídos, infraestrutura AWS e arquitetura limpa.',
    nameLabel: 'Nome',
    emailLabel: 'E-mail',
    messageLabel: 'Mensagem',
    send: 'Enviar mensagem',
    sending: 'Enviando…',
    success: 'Mensagem enviada! Entrarei em contato em breve.',
    error: 'Algo deu errado. Tente novamente ou me envie um e-mail diretamente.',
  },

  footer: {
    built: 'Feito com React + AWS.',
    visitorsLabel: 'visitantes',
  },

  github: {
    title: 'Atividade no GitHub',
    commits: 'Commits Recentes',
    repos: 'Repositórios',
    noActivity: 'Nenhuma atividade recente',
    starsLabel: 'estrelas',
  },

  infra: {
    title: 'Status da Infra',
    apiLabel: 'API',
    frontendLabel: 'Frontend',
    lastDeployLabel: 'Último Deploy',
    versionLabel: 'Versão',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusDegraded: 'Degradado',
    relativeTime: (mins) => {
      if (mins < 1) return 'agora mesmo'
      if (mins < 60) return `há ${mins}min`
      if (mins < 1440) return `há ${Math.floor(mins / 60)}h`
      return `há ${Math.floor(mins / 1440)}d`
    },
  },
}
