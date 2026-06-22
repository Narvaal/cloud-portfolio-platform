import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Section } from './ui/Section'
import { sendContactMessage } from '../services/api'
import { useLang } from '../i18n'

type Status = 'idle' | 'sending' | 'success' | 'error'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-400'

export function ContactSection() {
  const { t } = useLang()
  const { contact } = t
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<Status>('idle')
  const arrivedAt = useRef(Date.now())

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      await sendContactMessage({
        ...form,
        timeOnSite: Math.round((Date.now() - arrivedAt.current) / 1000),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
      })
      setStatus('success')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <Section id="contact" eyebrow={contact.eyebrow} title={contact.title}>
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-6 text-lg leading-relaxed">{contact.description}</p>
          <p className="leading-relaxed text-zinc-500">{contact.availability}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {contact.nameLabel}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {contact.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="message"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {contact.messageLabel}
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              value={form.message}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
              <CheckCircle className="size-4 shrink-0" />
              {contact.success}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              {contact.error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={status === 'sending'}>
            {status === 'sending' ? contact.sending : contact.send}
          </Button>
        </form>
      </div>
    </Section>
  )
}
