import Link from 'next/link';

const features = [
  {
    eyebrow:'CAPTURE',
    title:'Bring coaching knowledge in.',
    text:'Upload PDFs, paste notes, or drop in coaching content from around the web. CoachVault turns scattered resources into structured coaching knowledge.'
  },
  {
    eyebrow:'UNDERSTAND',
    title:'Let the Engine do the prep work.',
    text:'CoachVault identifies purpose, skills, coaching cues, setup, constraints, progressions, and evidence — while preserving the source.'
  },
  {
    eyebrow:'USE',
    title:'Walk onto the field ready.',
    text:'Build practices from your Vault, review drills at a glance, print Coach Practice Cards, and reuse what works without starting over every week.'
  }
];

const paths = [
  {
    title:'For Coaches',
    text:'Turn your own drills, notes, videos, and resources into a coaching system you can actually reuse.',
    cta:'Open CoachVault'
  },
  {
    title:'For Clubs & Programs',
    text:'Create a shared coaching foundation while still giving every coach room to build and preserve their own knowledge.',
    cta:'Explore the Vision'
  },
  {
    title:'For Coach Developers',
    text:'Preserve how you teach — not just what you teach — and give coaches a clearer path from resource to field.',
    cta:'See How It Works'
  }
];

function Mark() {
  return (
    <div className="cvMark" aria-hidden="true">
      <span className="cvMarkC">C</span>
      <span className="cvMarkV">V</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="marketingHome">
      <nav className="marketingNav">
        <Link href="/" className="brandLockup">
          <Mark />
          <div>
            <strong>CoachVault</strong>
            <span>Coaching knowledge, organized.</span>
          </div>
        </Link>

        <div className="navLinks">
          <a href="#system">How It Works</a>
          <a href="#why">Why CoachVault</a>
          <a href="#paths">Who It&apos;s For</a>
        </div>

        <Link href="/workspace" className="navCta">Open CoachVault</Link>
      </nav>

      <section className="heroSection">
        <div className="heroCopy">
          <div className="heroEyebrow">THE COACHING KNOWLEDGE ENGINE</div>
          <h1>Your best coaching knowledge shouldn&apos;t live in 20 different places.</h1>
          <p className="heroLead">
            CoachVault captures the drills, ideas, notes, videos, and resources you already trust —
            understands them — and turns them into reusable knowledge you can coach from.
          </p>

          <div className="heroActions">
            <Link href="/workspace" className="primaryHeroBtn">Open CoachVault</Link>
            <a href="#system" className="secondaryHeroBtn">See how it works</a>
          </div>

          <div className="heroPromise">
            <span>Capture what you know.</span>
            <span>Build faster.</span>
            <span>Coach more.</span>
          </div>
        </div>

        <div className="heroVisual">
          <div className="heroGlow" />
          <div className="vaultWindow">
            <div className="vaultWindowTop">
              <div className="windowDots"><i/><i/><i/></div>
              <span>COACHVAULT ENGINE</span>
              <b>UNDERSTANDING</b>
            </div>

            <div className="vaultSource">
              <div className="sourceIcon">▶</div>
              <div>
                <small>SOURCE</small>
                <strong>Social video · shooting progression</strong>
                <span>On-screen text + demonstrated actions + transcript</span>
              </div>
            </div>

            <div className="engineLine">
              <span className="enginePulse" />
              <div>
                <small>ENGINE ANALYSIS</small>
                <strong>Turning source material into reusable coaching knowledge…</strong>
              </div>
            </div>

            <div className="knowledgeGrid">
              <div><small>PURPOSE</small><strong>Develop shooting variety</strong></div>
              <div><small>PRIMARY SKILL</small><strong>Shooting · 92%</strong></div>
              <div><small>COACH FOCUS</small><strong>Footwork + release</strong></div>
              <div><small>PROGRESSION</small><strong>3 connected variations</strong></div>
            </div>

            <div className="practiceCardMini">
              <span>COACH PRACTICE CARD</span>
              <strong>Ready for your Vault</strong>
              <button>Review knowledge →</button>
            </div>
          </div>
        </div>
      </section>

      <section className="trustStrip">
        <span>Built for real coaches</span>
        <span>Source-aware analysis</span>
        <span>Reusable practice knowledge</span>
        <span>Your Vault stays yours</span>
      </section>

      <section className="problemSection" id="why">
        <div className="sectionLabel">THE PROBLEM</div>
        <div className="problemGrid">
          <div>
            <h2>Coaches don&apos;t need more content. They need to stop rebuilding everything from scratch.</h2>
          </div>
          <div className="problemCopy">
            <p>
              Great coaching ideas are everywhere — notebooks, screenshots, PDFs, old practice plans,
              YouTube, TikTok, texts from another coach. Finding them again is the problem.
            </p>
            <p>
              CoachVault creates a memory for your coaching. What you learn this season becomes usable
              knowledge next season instead of disappearing into another folder.
            </p>
          </div>
        </div>

        <div className="problemCards">
          <article>
            <span>01</span>
            <h3>Stop hunting</h3>
            <p>Your trusted material lives in one searchable coaching Vault.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Stop rewriting</h3>
            <p>The Engine turns sources into structured Coach Practice Cards.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Stop restarting</h3>
            <p>Build from knowledge you&apos;ve already reviewed instead of beginning at zero.</p>
          </article>
        </div>
      </section>

      <section className="systemSection" id="system">
        <div className="sectionIntro">
          <div className="sectionLabel">THE COACHVAULT LOOP</div>
          <h2>Capture it once. Understand it. Use it forever.</h2>
          <p>CoachVault connects knowledge capture directly to practice preparation.</p>
        </div>

        <div className="featureSteps">
          {features.map((feature, index) => (
            <article key={feature.title} className="featureStep">
              <div className="stepNumber">0{index + 1}</div>
              <div className="stepIcon">
                {index === 0 ? '↓' : index === 1 ? '◇' : '✓'}
              </div>
              <span>{feature.eyebrow}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="knowledgeSection">
        <div className="knowledgeCopy">
          <div className="sectionLabel light">NOT ANOTHER DRILL LIBRARY</div>
          <h2>CoachVault understands the coaching around the drill.</h2>
          <p>
            A drill name isn&apos;t enough. The useful knowledge is why you run it, what you&apos;re watching,
            how you set it up, when to progress it, and what makes it work.
          </p>

          <div className="knowledgeTags">
            <span>Purpose</span><span>Skills</span><span>Coaching Cues</span>
            <span>Setup</span><span>Progressions</span><span>Constraints</span>
            <span>Common Mistakes</span><span>Evidence</span>
          </div>
        </div>

        <div className="knowledgeCard">
          <div className="knowledgeCardTop">
            <small>COACH PRACTICE CARD</small>
            <span>Source-supported</span>
          </div>
          <h3>Uneven Half Field Build Up</h3>
          <p>Progressive numbers-up transition drill that grows toward full-field offensive and defensive organization.</p>
          <div className="cardMeta">
            <div><small>WHEN TO USE</small><strong>Decision making + transition</strong></div>
            <div><small>PARTICIPATION</small><strong>Progressive live play</strong></div>
            <div><small>FIELD</small><strong>Half field</strong></div>
          </div>
          <div className="miniField">
            <div className="crease" />
            <div className="goal" />
            <span className="p1">O</span><span className="p2">O</span><span className="p3">O</span>
            <span className="d1">D</span><span className="d2">D</span>
            <span className="queue q1">••••</span><span className="queue q2">•••</span>
          </div>
        </div>
      </section>

      <section className="pathsSection" id="paths">
        <div className="sectionIntro">
          <div className="sectionLabel">START WHERE YOU ARE</div>
          <h2>One coaching system. Different ways in.</h2>
          <p>The Vault grows with the coach, the team, and eventually the whole program.</p>
        </div>

        <div className="pathGrid">
          {paths.map((path, index) => (
            <article key={path.title}>
              <span className="pathNum">0{index + 1}</span>
              <h3>{path.title}</h3>
              <p>{path.text}</p>
              <Link href={index === 0 ? '/workspace' : '#system'}>{path.cta} →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="finalCta">
        <div>
          <div className="sectionLabel light">SAVE THE PREP WORK</div>
          <h2>Spend less time rebuilding practices. Spend more time coaching.</h2>
        </div>
        <Link href="/workspace" className="finalCtaButton">Open CoachVault →</Link>
      </section>

      <footer className="marketingFooter">
        <Link href="/" className="brandLockup footerBrand">
          <Mark />
          <div><strong>CoachVault</strong><span>Coaching knowledge, organized.</span></div>
        </Link>
        <p>Built to preserve, understand, and organize coaching knowledge.</p>
        <Link href="/workspace">Enter Workspace →</Link>
      </footer>
    </main>
  );
}
