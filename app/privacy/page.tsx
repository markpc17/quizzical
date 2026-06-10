import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Notice — Quizzicle',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-dark px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-brand-yellow font-fredoka text-lg hover:text-brand-yellow/70 transition-colors"
        >
          ← Quizzicle
        </Link>

        <h1 className="font-fredoka text-4xl text-brand-yellow mt-6 mb-2">Privacy Notice</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: 10 June 2026</p>

        <div className="flex flex-col gap-8 text-white/80 leading-relaxed">

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">Who we are</h2>
            <p>
              Quizzicle is operated by Mark Carruthers. If you have any questions about your data,
              contact us at{' '}
              <a href="mailto:markpc17@sky.com" className="text-brand-yellow hover:underline">
                markpc17@sky.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">What we collect</h2>
            <p className="mb-3">When you play Quizzicle we collect only what&apos;s needed to run the game:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>
                <span className="text-white">Display name</span> — the nickname you choose when
                joining a game. This does not need to be your real name.
              </li>
              <li>
                <span className="text-white">Avatar choice</span> — a number (1–20) identifying
                which avatar you picked.
              </li>
              <li>
                <span className="text-white">Quiz answers</span> — which answer you selected for
                each question and how long you took.
              </li>
              <li>
                <span className="text-white">Session token</span> — a random ID stored in your
                browser&apos;s local storage so you can rejoin a game if you disconnect. It
                contains no personal information.
              </li>
            </ul>
            <p className="mt-3 text-white/60 text-sm">
              We do not collect your email address, real name, location, or any other identifying
              information. No user accounts are required to play.
            </p>
          </section>

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">Why we use it</h2>
            <p>
              We process this data solely to run the quiz game you requested — displaying scores,
              driving the leaderboard, and letting you rejoin if you lose connection. Our lawful
              basis is <strong className="text-white">legitimate interests</strong> (Article 6(1)(f)
              UK GDPR): the processing is necessary to deliver the service you chose to use, and
              the data collected is minimal and temporary.
            </p>
          </section>

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">How long we keep it</h2>
            <p>
              Game data (including your nickname, avatar, and answers) is{' '}
              <strong className="text-white">deleted automatically</strong> once the game expires
              — typically within 24 hours of the game code being created, or within 24 hours of
              the game finishing, whichever comes first. Nothing is archived or retained after
              deletion.
            </p>
          </section>

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">Third parties</h2>
            <p className="mb-3">
              We share your game data with one sub-processor:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>
                <span className="text-white">Supabase</span> — our database and real-time
                infrastructure provider. Data is stored in the EU (West Europe region). Supabase
                acts as a data processor under a Data Processing Agreement.
              </li>
            </ul>
            <p className="mt-3 text-white/60 text-sm">
              We do not sell, rent, or share your data with advertisers or any other third parties.
            </p>
          </section>

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">Your rights</h2>
            <p className="mb-3">Under UK GDPR you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Access the personal data we hold about you</li>
              <li>Request erasure of your data</li>
              <li>Restrict or object to processing</li>
              <li>
                Lodge a complaint with the{' '}
                <a
                  href="https://ico.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow hover:underline"
                >
                  ICO
                </a>
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:markpc17@sky.com" className="text-brand-yellow hover:underline">
                markpc17@sky.com
              </a>. Because game data is deleted within 24 hours, most erasure requests will
              already have been fulfilled automatically.
            </p>
          </section>

          <section>
            <h2 className="font-fredoka text-xl text-white mb-2">Cookies and local storage</h2>
            <p>
              Quizzicle does not use tracking cookies or analytics. We store a session token in
              your browser&apos;s local storage to let you rejoin a game; this is strictly
              necessary for the service and contains no personal data. It is cleared when you
              leave the game.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
