import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { About } from './components/About'
import { ExperienceSection } from './components/ExperienceSection'
import { ProjectsSection } from './components/ProjectsSection'
import { CertificationsSection } from './components/CertificationsSection'
import { ContactSection } from './components/ContactSection'
import { Footer } from './components/Footer'
import { BackgroundEffects } from './components/BackgroundEffects'

export function Portfolio() {
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <main>
        <Hero />
        <About />
        <ExperienceSection />
        <ProjectsSection />
        <CertificationsSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
