'use client';

import { CVIL } from './cvil';
import { useEffect, useMemo, useState } from 'react';
import { upload } from '@vercel/blob/client';


const skillFolderMap = {
  'Ground Balls': 'Skills',
  'Cradling': 'Skills',
  'Catching': 'Skills',
  'Passing': 'Skills',
  'Ball Protection': 'Skills',
  'Athletic Movement': 'Player Development',
  'On-Ball Defense': 'Defense',
  'Off-Ball Defense': 'Defense',
  'Clearing': 'Transition',
  'Riding': 'Transition',
  'Shooting': 'Offense',
  'Dodging': 'Offense',
  'Feeding': 'Offense',
  'Finishing': 'Offense',
  'Goalie': 'Goalie',
  'Faceoffs': 'Faceoffs'
};

function suggestedFolderFor(item) {
  const skill = item?.primarySkill?.name || '';
  return item?.folder && item.folder !== 'Unfiled'
    ? item.folder
    : skillFolderMap[skill] || 'Skills';
}


function makeLegacyPracticeCard(item) {
  const setup = item?.setup || {};
  return {
    purpose: item?.summary || 'Use this drill to develop the listed skill and objectives.',
    whenToUse: (item?.commonMistakes || []).slice(0, 4).map((mistake) => `Players ${String(mistake).replace(/^Players\s+/i, '').replace(/[.]$/, '').toLowerCase()}.`),
    setup: {
      players: { value: setup.players || 'Not stated', source: setup.players ? 'Detected' : 'Not stated' },
      groups: { value: 'Not stated', source: 'Not stated' },
      equipment: { value: setup.equipment || [], source: setup.equipment?.length ? 'Detected' : 'Not stated' },
      space: { value: setup.space || 'Not stated', source: setup.space ? 'Detected' : 'Not stated' },
      time: { value: setup.duration ? `${setup.duration} minutes` : 'Not stated', source: setup.duration ? 'Detected' : 'Not stated' },
      rotation: { value: 'Not stated', source: 'Not stated' }
    },
    runTheDrill: [
      'Review the original source and identify the starting positions.',
      'Organize players using the saved setup information.',
      'Run the activity through the listed learning objectives and coaching cues.',
      'Stop briefly to correct the most important common mistake.',
      'Repeat the drill and use the success criteria to judge improvement.'
    ],
    coachFocus: (item?.coachingCues || []).slice(0, 4),
    watchFor: (item?.commonMistakes || []).slice(0, 4),
    makeEasier: item?.regressions || [],
    makeHarder: item?.progressions || [],
    prerequisites: [],
    avoidIf: [],
    successCriteria: item?.learningObjectives || [],
    fieldDiagram: { type: 'text', description: 'No diagram description was saved with this legacy item.' },
    notes: ''
  };
}

function practiceCardFor(item) {
  return item?.coachPracticeCard || makeLegacyPracticeCard(item);
}

function provenanceLabel(value) {
  if (!value) return 'Not stated';
  return value;
}

const seedDrills = [
  {
    id: 1,
    title: 'Ground Ball Advantage Drill',
    resourceType: 'Drill',
    status: 'Approved',
    folder: 'Skills',
    sourceType: 'CoachVault Foundation',
    summary: 'Competitive small-sided ground-ball work that finishes with an outlet decision.',
    coachPracticeCard: {
      purpose: 'Teach players to win a contested ground ball, secure possession, and make the next useful play.',
      whenToUse: ['Players stop their feet before the scoop.', 'Players expose the stick after possession.', 'Players fail to find an outlet after winning the ball.'],
      setup: {
        players: { value: '6-12', source: 'Detected' },
        groups: { value: 'Two teams or lines', source: 'Estimated' },
        equipment: { value: ['Balls', 'Cones'], source: 'Detected' },
        space: { value: 'Small grid', source: 'Detected' },
        time: { value: '8-12 minutes', source: 'Estimated' },
        rotation: { value: 'Players rotate out after each rep.', source: 'Estimated' }
      },
      runTheDrill: [
        'Place players in two groups around a small grid.',
        'Start each rep by rolling a loose ball into the playing area.',
        'Players compete to gain possession without stopping their feet.',
        'The winner protects the stick and accelerates away from pressure.',
        'Complete an outlet pass to finish the rep, then rotate players.'
      ],
      coachFocus: ['Run through the ball.', 'Protect before looking for the outlet.', 'Accelerate for the first three steps.'],
      watchFor: ['Stopping before the scoop.', 'Scooping upright.', 'Exposing the stick after possession.'],
      makeEasier: ['Use an uncontested ball.', 'Shorten the approach distance.', 'Remove the outlet requirement.'],
      makeHarder: ['Add a trailing defender.', 'Require an opposite-hand pickup.', 'Add a second outlet option and force a read.'],
      prerequisites: ['Players understand basic ground-ball posture.'],
      avoidIf: ['Players have not learned safe contact and box-out rules.'],
      successCriteria: ['Possession is gained in one motion.', 'The ball carrier exits pressure under control.', 'The rep ends with a useful pass or clear.'],
      fieldDiagram: { type: 'text', description: 'Two lines face a small central grid. The coach rolls a ball into the grid and an outlet waits outside.' },
      notes: ''
    },
    teachingMethod: 'Small-Sided Competition',
    primarySkill: { name: 'Ground Balls', weight: 96, reason: 'Winning and securing the loose ball is the central learning purpose.' },
    skillComponents: [
      { name: 'Scoop Through', weight: 94 },
      { name: 'Stick Protection', weight: 87 },
      { name: 'First Three Steps', weight: 76 },
      { name: 'Outlet Recognition', weight: 58 }
    ],
    supportingSkills: [{ name: 'Decision Making', weight: 67 }],
    incidentalActions: [{ name: 'Passing', weight: 24, reason: 'Passing completes the activity but is not the main teaching target.' }],
    learningObjectives: [
      'Gain possession without stopping the feet.',
      'Protect the stick immediately after the scoop.',
      'Recognize the safest outlet after possession.'
    ],
    setup: { players: '6-12', duration: 12, equipment: ['Balls', 'Cones'], space: 'Small grid', age: ['10U', '12U', '14U'] },
    coachingCues: ['Run through the ball.', 'Protect before you look.', 'Win first, pass second.'],
    commonMistakes: ['Stopping before the scoop.', 'Scooping upright.', 'Exposing the stick after possession.'],
    evidence: [{ text: 'Players compete for the loose ball, run through the scoop, and find the outlet.', location: 'Foundation description' }],
    sourceUrl: '',
    updated: 'Foundation'
  }
];

const skillFramework = {
  name: 'Ground Balls',
  definition: 'Gain possession of a loose ball while maintaining body control, protecting possession, and making the next useful decision.',
  components: ['Approach', 'Athletic Position', 'Hand Placement', 'Scoop Through', 'Stick Protection', 'First Three Steps', 'Exit Direction', 'Outlet Recognition'],
  purposeRule: 'Tag Ground Balls only when gaining, securing, or exiting possession from a loose-ball situation is a central learning purpose.'
};

function readableError(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || String(value);

  if (typeof value === 'object') {
    const candidates = [
      value.message,
      value.details,
      value.detail,
      value.error_description,
      value.error?.message,
      value.error?.details,
      value.error
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    try { return JSON.stringify(value); } catch (_) {}
  }

  return String(value);
}

function friendlyEngineError(error) {
  const message = readableError(error);

  if (/Failed to retrieve the client token|client token/i.test(message)) {
    return 'Large-file storage is not connected correctly to this CoachVault deployment. In Vercel, open the Blob store, confirm the CoachVault production project is connected, upgrade the connection to OIDC if offered, then redeploy.';
  }

  if (/BLOB_READ_WRITE_TOKEN|blob.*token|token.*blob/i.test(message)) {
    return 'CoachVault can see the large-file upload feature, but this deployment does not currently have permission to use its Blob store. Check the Blob store project connection in Vercel and redeploy.';
  }

  if (/PRIVATE_BLOB_RETRIEVAL_FAILED|could not retrieve the private file|could not open the private file/i.test(message)) {
    return 'CoachVault stored the document privately, but the Engine could not reopen it for analysis. Confirm the private Blob store is connected to the production CoachVault project and redeploy.';
  }

  if (/rate.limit|429|too many requests/i.test(message)) {
    return `The social-video service temporarily rate-limited this request. CoachVault will retry automatically when possible. ${message}`.trim();
  }

  return message || 'CoachVault could not complete the request.';
}

function formatConfidence(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n <= 1 ? n * 100 : n);
}

export default function Home() {
  const [active, setActive] = useState('Atlas');
  const [mode, setMode] = useState('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [sourceMeta, setSourceMeta] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [socialJobStatus, setSocialJobStatus] = useState('');

  const [internalMode, setInternalMode] = useState(false);
  const [drills, setDrills] = useState(seedDrills);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('All');
  const [selectedSkillId, setSelectedSkillId] = useState(CVIL[0]?.id || '');

  const [practicePrompt, setPracticePrompt] = useState('');
  const [practiceDuration, setPracticeDuration] = useState(90);
  const [practicePlayers, setPracticePlayers] = useState(18);
  const [practicePlan, setPracticePlan] = useState(null);
  const [practiceBuilderOpen, setPracticeBuilderOpen] = useState(false);
  const [savedPractices, setSavedPractices] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [calendarPractice, setCalendarPractice] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [pendingCalendarDate, setPendingCalendarDate] = useState('');
  const [calendarCreateDate, setCalendarCreateDate] = useState('');



  useEffect(() => {
    try {
      const stored = localStorage.getItem('coachvault-atlas-alpha');
      if (stored) {
        const migrated = JSON.parse(stored).map((item) => ({
          ...item,
          folder: suggestedFolderFor(item),
          coachPracticeCard: item.coachPracticeCard || makeLegacyPracticeCard(item)
        }));
        setDrills(migrated);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('coachvault-atlas-alpha', JSON.stringify(drills));
  }, [drills]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('coachvault-practices-alpha');
      if (stored) setSavedPractices(JSON.parse(stored));
      const scheduled = localStorage.getItem('coachvault-calendar-alpha');
      if (scheduled) setCalendarEvents(JSON.parse(scheduled));
    } catch (_) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('coachvault-practices-alpha', JSON.stringify(savedPractices));
  }, [savedPractices]);

  useEffect(() => {
    localStorage.setItem('coachvault-calendar-alpha', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      return;
    }
    const stageMs = 2400;
    const timer = setInterval(() => {
      setProgressStep((current) => Math.min(current + 1, 5));
    }, stageMs);
    return () => clearInterval(timer);
  }, [loading]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drills.filter((d) => {
      const matchesSearch = JSON.stringify(d).toLowerCase().includes(q);
      const matchesFolder = folderFilter === 'All' || (d.folder || suggestedFolderFor(d)) === folderFilter;
      return matchesSearch && matchesFolder;
    });
  }, [drills, search, folderFilter]);

  const folders = useMemo(() => {
    return ['All', ...Array.from(new Set(drills.map((d) => d.folder || suggestedFolderFor(d))))];
  }, [drills]);

  async function waitForSocialVideo(jobId, originalUrl) {
    setSocialJobStatus('Reading the full social video…');

    for (let attempt = 0; attempt < 72; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500));

      const response = await fetch('/api/engine/analyze/social-status', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ jobId, url:originalUrl })
      });

      const raw = await response.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch (_) { throw new Error(raw || 'Unexpected social-video status response.'); }

      if (response.status === 202 || data.status === 'processing') {
        setSocialJobStatus(data.message || 'Reading video actions and on-screen coaching text…');
        setProgressStep((current) => Math.max(current, 1));
        continue;
      }

      if (!response.ok) throw new Error(readableError(data.error) || 'Social video analysis failed.');

      setSocialJobStatus('Video understood. Building the Coach Practice Card…');
      setProgressStep(4);

      if (data.status === 'completed' && data.evidence) {
        const evidenceText = [
          'FULL SOCIAL VIDEO VISUAL/AUDIO EXTRACTION:',
          JSON.stringify(data.evidence, null, 2),
          '',
          `ORIGINAL SOCIAL SOURCE URL: ${originalUrl}`,
          '',
          'This is evidence from the full video. Prioritize on-screen instructional text and repeated demonstrated actions. Preserve named variations. Do not invent setup details that are not supported.'
        ].join('\n');

        const analyzeResponse = await fetch('/api/engine/analyze', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body:JSON.stringify({
            mode:'text',
            text:evidenceText
          })
        });

        const analyzeRaw = await analyzeResponse.text();
        let analyzeData = {};
        try { analyzeData = analyzeRaw ? JSON.parse(analyzeRaw) : {}; }
        catch (_) { throw new Error(analyzeRaw || 'CoachVault could not interpret the completed video evidence.'); }

        if (!analyzeResponse.ok) {
          throw new Error(readableError(analyzeData.error) || 'CoachVault could not build the Practice Card from the completed video.');
        }

        analyzeData.sourceMeta = {
          ...(analyzeData.sourceMeta || {}),
          platform:'Social Video',
          url:originalUrl,
          accessStatus:'Full social video analyzed',
          sourceMethod:'Supadata asynchronous full-video intelligence'
        };

        if (analyzeData.diagnostics) {
          analyzeData.diagnostics.recognizedSource = {
            platform:'Social Video',
            method:'Asynchronous full-video intelligence',
            accessStatus:'Full video analyzed',
            fullVideoAnalyzed:true,
            videoExtractionJobId:jobId
          };
        }

        return analyzeData;
      }

      return data;
    }

    throw new Error('This video is taking longer than expected. Please try again later.');
  }

  async function runEngine() {
    setError('');
    setResult(null);
    setDiagnostics(null);
    setLoading(true);
    const analysisStartedAt = Date.now();
    try {
      let requestOptions;

      if (file && mode === 'file') {
        setUploadProgress(0);

        // Large files bypass the Vercel Function body-size limit by uploading
        // directly from the browser to Vercel Blob.
        if (file.size > 3.5 * 1024 * 1024) {
          const blob = await upload(
            `coachvault/${Date.now()}-${file.name}`,
            file,
            {
              access: 'private',
              handleUploadUrl: '/api/uploads',
              multipart: true,
              onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage || 0))
            }
          );

          requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'blob-file',
              blobUrl: blob.url,
              fileMeta: {
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size
              }
            })
          };
        } else {
          const form = new FormData();
          form.append('file', file);
          form.append('mode', 'file');
          requestOptions = { method: 'POST', body: form };
        }
      } else {
        requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, text, mode, transcript })
        };
      }

      const response = await fetch('/api/engine/analyze', requestOptions);
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(
          response.status === 413
            ? 'The upload exceeded the server request limit before CoachVault could process it.'
            : (responseText || `Unexpected server response (${response.status}).`)
        );
      }
      if (response.status === 202 && data.pendingSocialJob?.jobId) {
        data = await waitForSocialVideo(data.pendingSocialJob.jobId, url);
      }

      if (!response.ok && response.status !== 202) throw new Error(readableError(data.error) || 'The Engine could not complete the analysis.');
      const analyzed = { ...data.analysis, sourceUrl: data.analysis?.sourceUrl || url || '' };
      const stageMs = 2400;
      const minimumBeforeReview = stageMs * 6;
      const elapsed = Date.now() - analysisStartedAt;
      if (elapsed < minimumBeforeReview) {
        await new Promise((resolve) => setTimeout(resolve, minimumBeforeReview - elapsed));
      }
      setProgressStep(6);
      await new Promise((resolve) => setTimeout(resolve, stageMs));
      setResult({ ...analyzed, folder: suggestedFolderFor(analyzed) });
      setSourceMeta(data.sourceMeta || null);
      setDiagnostics(data.diagnostics || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setSocialJobStatus('');
    }
  }

  function updateResult(path, value) {
    setResult((current) => {
      const next = structuredClone(current);
      const parts = path.split('.');
      let cursor = next;
      parts.slice(0, -1).forEach((p) => cursor = cursor[p]);
      cursor[parts.at(-1)] = value;
      return next;
    });
  }

  function updateWeighted(group, index, field, value) {
    setResult((current) => ({
      ...current,
      [group]: (current[group] || []).map((item, i) =>
        i === index ? { ...item, [field]: field === 'weight' ? Number(value) : value } : item
      )
    }));
  }

  function buildPracticePlan() {
    const words = practicePrompt.toLowerCase().split(/\W+/).filter(Boolean);
    const scored = drills.map((drill) => {
      const haystack = [
        drill.title,
        drill.summary,
        drill.primarySkill?.name,
        ...(drill.skillComponents || []).map(x => x.name)
      ].join(' ').toLowerCase();
      const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return { drill, score };
    }).sort((a,b) => b.score - a.score);

    const selectedDrills = scored.slice(0, Math.min(4, Math.max(1, drills.length))).map(x => x.drill);
    const warmup = selectedDrills[0];
    const skill = selectedDrills[1] || selectedDrills[0];
    const competition = selectedDrills[2] || selectedDrills[1] || selectedDrills[0];
    const team = selectedDrills[3] || selectedDrills[2] || selectedDrills[0];

    const total = Number(practiceDuration) || 90;
    const segments = [
      { label:'Arrival + Warm-Up', minutes:Math.max(10, Math.round(total*.14)), drill:warmup },
      { label:'Skill Development', minutes:Math.max(15, Math.round(total*.23)), drill:skill },
      { label:'Competitive Constraint', minutes:Math.max(15, Math.round(total*.22)), drill:competition },
      { label:'Team Application', minutes:Math.max(20, Math.round(total*.28)), drill:team },
      { label:'Finish + Review', minutes:Math.max(5, total - (Math.max(10, Math.round(total*.14))+Math.max(15, Math.round(total*.23))+Math.max(15, Math.round(total*.22))+Math.max(20, Math.round(total*.28)))), drill:null }
    ];

    setPracticePlan({
      id: Date.now(),
      title:'CoachVault Practice Plan',
      prompt:practicePrompt,
      duration:total,
      players:practicePlayers,
      focus:practicePrompt || 'Coach-selected practice focus',
      segments: segments.map(segment => ({...segment, status:'review', locked:false}))
    });
    setReplaceIndex(null);
  }

  function updatePlanSegment(index, patch) {
    setPracticePlan((current) => ({
      ...current,
      segments: current.segments.map((segment, i) => i === index ? { ...segment, ...patch } : segment)
    }));
  }

  function replacementOptions(index) {
    const current = practicePlan?.segments?.[index]?.drill;
    const used = new Set((practicePlan?.segments || []).map(s => s.drill?.id).filter(Boolean));
    return drills
      .filter(d => d.id !== current?.id && !used.has(d.id))
      .slice(0, 4);
  }

  function replacePracticeDrill(index, drill) {
    updatePlanSegment(index, { drill, status:'review', locked:false });
    setReplaceIndex(null);
  }

  function savePracticePlan() {
    if (!practicePlan) return;
    const saved = {
      ...practicePlan,
      id: practicePlan.id || Date.now(),
      savedAt: new Date().toISOString(),
      status: 'Saved'
    };
    setSavedPractices((current) => {
      const exists = current.some(p => p.id === saved.id);
      return exists ? current.map(p => p.id === saved.id ? saved : p) : [saved, ...current];
    });

    if (pendingCalendarDate) {
      setCalendarEvents((current) => [
        ...current.filter(event => !(event.practiceId === saved.id && event.date === pendingCalendarDate)),
        {
          id: Date.now() + 1,
          practiceId: saved.id,
          title: saved.title || 'Practice',
          focus: saved.focus || '',
          date: pendingCalendarDate,
          time: '',
          location: '',
          duration: saved.duration
        }
      ]);
      setPendingCalendarDate('');
    }

    setPracticePlan(saved);
  }

  function schedulePractice(plan) {
    setCalendarPractice(plan);
    setScheduleDate('');
    setScheduleTime('');
    setScheduleLocation('');
  }

  function confirmSchedulePractice() {
    if (!calendarPractice || !scheduleDate) return;
    const event = {
      id: Date.now(),
      practiceId: calendarPractice.id || null,
      title: calendarPractice.title || 'Practice',
      focus: calendarPractice.focus || '',
      date: scheduleDate,
      time: scheduleTime,
      location: scheduleLocation,
      duration: calendarPractice.duration
    };
    setCalendarEvents((current) => [event, ...current]);
    setCalendarPractice(null);
  }

  function beginPracticeFromCalendar(date) {
    setCalendarCreateDate('');
    setPendingCalendarDate(date);
    setPracticePrompt('');
    setPracticePlan(null);
    setPracticeBuilderOpen(true);
    setActive('Database');
  }

  function calendarDayClicked(date) {
    setCalendarCreateDate(date);
  }

  function approve() {
    const asset = {
      ...result,
      id: Date.now(),
      status: 'Approved',
      folder: suggestedFolderFor(result),
      sourceType: sourceMeta?.platform || (mode === 'link' ? 'Web / Social Link' : 'Pasted Text'),
      sourceUrl: result.sourceUrl || url,
      updated: 'Just now'
    };
    setDrills((current) => [asset, ...current]);
    setResult(null);
    setDiagnostics(null);
    setUrl('');
    setText('');
    setTranscript('');
    setFile(null);
    setActive('Database');
    setSelected(null);
  }

  return (
    <main className="appShell">
      <header className="globalHeader">
        <div className="brandLockup branded">
          <img src="/coachvault-logo.png" alt="CoachVault" className="coachVaultLogo" />
          <small className="engineVersion">Engine 3.5.9</small>
        </div>
        <div className="globalSearch">Search drills, skills, and sources</div>
        <div className="headerActions">
          <label className="modeToggle"><input type="checkbox" checked={internalMode} onChange={(e) => setInternalMode(e.target.checked)} /><span>Internal tools</span></label>
          <span className="avatar">J</span>
        </div>
      </header>

      <nav className="sectionNav">
        {['Atlas', 'Database', 'Practices', 'Calendar', 'Skills', 'Test Results'].map((item) => (
          <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>
        ))}
      </nav>

      <div className="workspaceShell">
        <aside className="iconRail">
          <button className={active === 'Atlas' ? 'active' : ''} onClick={() => setActive('Atlas')}><span>⚙</span><small>Engine</small></button>
          <button className={active === 'Database' ? 'active' : ''} onClick={() => setActive('Database')}><span>▣</span><small>Vault</small></button>
          <button className={active === 'Practices' ? 'active' : ''} onClick={() => setActive('Practices')}><span>≡</span><small>Practices</small></button>
          <button className={active === 'Calendar' ? 'active' : ''} onClick={() => setActive('Calendar')}><span>□</span><small>Calendar</small></button>
          <button className={active === 'Skills' ? 'active' : ''} onClick={() => setActive('Skills')}><span>◎</span><small>Skills</small></button>
          <button className={active === 'Test Results' ? 'active' : ''} onClick={() => setActive('Test Results')}><span>✓</span><small>Tests</small></button>
        </aside>

        <section className="main">
          {!loading && <header className="pageHeader">
            <div>
              <small>COACHVAULT WORKSPACE</small>
              <h1>{active}</h1>
              <p>{active === 'Atlas' ? 'Add a source and turn it into a structured coaching asset.' : active === 'Database' ? 'Review and organize approved items in your Vault.' : active === 'Practices' ? 'Saved practice plans, ready to reuse or schedule.' : active === 'Calendar' ? 'Optionally schedule practices when it helps your season planning.' : active === 'Skills' ? 'Manage the skill language that powers the Engine.' : 'Measure how consistently the Engine understands coaching content.'}</p>
            </div>
            <div className="headerMetrics">
              <span><b>{drills.length}</b><small>Approved</small></span>
              <span><b>{CVIL.length}</b><small>Standards</small></span>
            </div>
          </header>}

        {active === 'Atlas' && !result && (
          <>
            {!loading && <section className="welcomeStrip">
              <div>
                <span>ENGINE WORKSPACE</span>
                <h2>What would you like CoachVault to analyze?</h2>
                <p>Add a link, text, or file. CoachVault will organize it before anything enters your Vault.</p>
              </div>
              <button onClick={() => setActive('Database')}>Open Vault</button>
            </section>}
            <section className={`inputPanel inputPanelTop simplifiedPanel compactAtlasPanel ${loading ? 'engineRunningPanel' : ''}`}>
              <div className="tabs">
                <button className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>Web / Social Link</button>
                <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>Paste Text</button>
                <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>Upload File</button>
              </div>

              {!loading && mode === 'link' && <div className="inputBody">
                <label>Website, YouTube, Instagram, or TikTok URL</label>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a public coaching link..." />
                <div className="recognizedSources">
                  <span><b>▶</b>YouTube</span><span><b>♪</b>TikTok</span><span><b>◎</b>Instagram</span><span><b>↗</b>Web</span>
                </div>
                <div className="socialIntelligenceNote compact">
                  <b>Social Video Intelligence</b>
                  <span>Reads video actions, on-screen text, audio, and post metadata. Slow jobs stay open automatically.</span>
                </div>
                <details><summary>Paste transcript or source text as a fallback</summary><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Optional transcript..." /></details>
                <button disabled={!url.trim()} onClick={runEngine}>Analyze with CoachVault</button>
              </div>}

              {!loading && mode === 'text' && <div className="inputBody">
                <label>Drill description, transcript, or coaching notes</label>
                <textarea className="large" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste content for the Engine to analyze..." />
                <button disabled={!text.trim()} onClick={runEngine}>Analyze with CoachVault</button>
              </div>}

              {!loading && mode === 'file' && <div className="inputBody fileUploadBody">
                <label className="fileDrop">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <div className="fileDropHeroIcon" aria-hidden="true">⇧</div>
                  <div className="fileDropCopy">
                    <strong>{file ? file.name : 'Drop a coaching file here'}</strong>
                    <span>{file ? 'Ready to analyze' : 'or click to choose a file'}</span>
                  </div>
                  <div className="fileTypeRow" aria-label="Supported file types">
                    <span className="fileTypeChip"><i>PDF</i><b>PDF</b></span>
                    <span className="fileTypeChip"><i>IMG</i><b>Images</b></span>
                    <span className="fileTypeChip"><i>DOC</i><b>Docs</b></span>
                    <span className="fileTypeChip"><i>PPT</i><b>Slides</b></span>
                    <span className="fileTypeChip"><i>TXT</i><b>Text</b></span>
                  </div>
                  <small className="fileDropHint">Practice plans, clinic notes, drill diagrams, presentations, and coaching documents</small>
                </label>
                {file && <div className="selectedFileMeta">
                  <span>{file.name}</span>
                  <small>{file.size >= 1024*1024 ? `${(file.size/(1024*1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size/1024))} KB`}</small>
                </div>}
                {loading && uploadProgress > 0 && uploadProgress < 100 && <div className="largeUploadProgress">
                  <div><span>Uploading document securely</span><b>{uploadProgress}%</b></div>
                  <progress value={uploadProgress} max="100" />
                </div>}
                <div className="largeFileSupport"><b>Private document upload</b><span>PDFs up to 10 MB • larger files are stored privately before Engine analysis</span></div>
                <button className="primaryBtn" disabled={!file || loading} onClick={runEngine}>Analyze with CoachVault</button>
              </div>}

              {loading && <EngineProgress step={progressStep} socialJobStatus={socialJobStatus} />}
              {error && <div className="error"><b>Engine stopped</b><p>{error}</p></div>}
            </section>
          </>
        )}

        {active === 'Atlas' && result && <Review result={result} sourceMeta={sourceMeta} diagnostics={diagnostics} internalMode={internalMode} updateResult={updateResult} updateWeighted={updateWeighted} approve={approve} discard={() => { setResult(null); setDiagnostics(null); }} />}

        {active === 'Database' && (
          <>
            <section className="sectionSummary"><span>APPROVED CONTENT</span><h2>Your Vault</h2><p>Organized coaching assets, each linked to its original source.</p></section>
            <div className="vaultActionRow">
              <button className="vaultBuilderLaunch" onClick={() => setPracticeBuilderOpen(!practiceBuilderOpen)}>
                <span className="vaultBuilderIcon">✦</span>
                <span><b>Build a Practice</b><small>Assemble a plan from your Vault</small></span>
              </button>
              <button className="addSourceCard" onClick={() => setActive('Atlas')}><span>＋</span><b>Add Source</b></button>
            </div>

            {practiceBuilderOpen && <section className="practiceBuilder">
              {pendingCalendarDate && <div className="calendarReservationBanner">
                <div><small>CALENDAR DATE RESERVED</small><b>{new Date(`${pendingCalendarDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</b></div>
                <span>This practice will be added to that date when you save it.</span>
                <button onClick={()=>setPendingCalendarDate('')}>Remove date</button>
              </div>}
              <div className="practiceBuilderIntro">
                <span>VAULT → PRACTICE</span>
                <h2>What does your team need today?</h2>
                <p>CoachVault will assemble a practice from approved drills in your Vault. It does not invent drills.</p>
              </div>
              <div className="practiceBuilderGrid">
                <label className="builderPrompt"><span>Practice focus</span><textarea value={practicePrompt} onChange={(e)=>setPracticePrompt(e.target.value)} placeholder="Example: 90 minute practice for 18 players. We need confidence passing under pressure, quicker decisions, and a competitive finish." /></label>
                <label><span>Minutes</span><input type="number" min="30" max="180" value={practiceDuration} onChange={(e)=>setPracticeDuration(e.target.value)} /></label>
                <label><span>Players</span><input type="number" min="4" max="60" value={practicePlayers} onChange={(e)=>setPracticePlayers(e.target.value)} /></label>
                <button className="buildPracticeBtn" disabled={!drills.length} onClick={buildPracticePlan}>Build Practice Plan</button>
              </div>
            </section>}

            {practicePlan && <PracticePlanCard plan={practicePlan} drills={drills} replaceIndex={replaceIndex} setReplaceIndex={setReplaceIndex} replacementOptions={replacementOptions} updatePlanSegment={updatePlanSegment} replacePracticeDrill={replacePracticeDrill} savePracticePlan={savePracticePlan} schedulePractice={schedulePractice} onClose={()=>setPracticePlan(null)} />}

            <div className="toolbar vaultToolbar">
              <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>{folders.map((folder) => <option key={folder}>{folder}</option>)}</select>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your Vault..." />
            </div>
            <div className="cards">{filtered.map((item) => <DrillCard key={item.id} item={item} onClick={() => setSelected(item)} />)}</div>
          </>
        )}


        {active === 'Practices' && (
          <>
            <section className="sectionSummary"><span>PRACTICE LIBRARY</span><h2>Saved Practices</h2><p>Practices can live here indefinitely. Scheduling is optional.</p></section>
            {!savedPractices.length ? <div className="emptyState"><b>No saved practices yet.</b><p>Build a practice from your Vault, review the drills, and save it here.</p><button onClick={()=>setActive('Database')}>Build a Practice</button></div> :
            <div className="practiceLibraryGrid">{savedPractices.map(plan => <article className="savedPracticeTile" key={plan.id}>
              <header><span>SAVED PRACTICE</span><b>{plan.duration} min</b></header>
              <h3>{plan.title}</h3>
              <p>{plan.focus}</p>
              <div className="savedPracticeStats"><span>{plan.players} players</span><span>{plan.segments.filter(s=>s.drill).length} drills</span></div>
              <footer><button onClick={()=>{setPracticePlan(plan);setActive('Database')}}>Open Plan</button><button onClick={()=>schedulePractice(plan)}>Add to Calendar</button></footer>
            </article>)}</div>}
          </>
        )}

        {active === 'Calendar' && <PracticeCalendar events={calendarEvents} savedPractices={savedPractices} schedulePractice={schedulePractice} onDayClick={calendarDayClicked} />}

        {active === 'Skills' && <CVILLibrary selectedSkillId={selectedSkillId} setSelectedSkillId={setSelectedSkillId} />}
        {active === 'Test Results' && <TestResults drills={drills} />}
        </section>
      </div>

      {calendarCreateDate && <div className="scheduleOverlay" onClick={()=>setCalendarCreateDate('')}>
        <section className="calendarCreateModal" onClick={(e)=>e.stopPropagation()}>
          <div className="calendarCreateIcon">＋</div>
          <small>NEW PRACTICE</small>
          <h2>Create practice?</h2>
          <p>{new Date(`${calendarCreateDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
          <span>CoachVault will take you to the Practice Builder. When you save the finished plan, it will automatically be added to this date.</span>
          <footer>
            <button onClick={()=>setCalendarCreateDate('')}>Cancel</button>
            <button className="primaryPlanBtn" onClick={()=>beginPracticeFromCalendar(calendarCreateDate)}>Create Practice</button>
          </footer>
        </section>
      </div>}

      {calendarPractice && <div className="scheduleOverlay" onClick={()=>setCalendarPractice(null)}>
        <section className="scheduleModal" onClick={(e)=>e.stopPropagation()}>
          <header><div><small>OPTIONAL CALENDAR</small><h2>Schedule this practice</h2><p>{calendarPractice.focus}</p></div><button onClick={()=>setCalendarPractice(null)}>×</button></header>
          <div className="scheduleFields">
            <label><span>Date</span><input type="date" value={scheduleDate} onChange={(e)=>setScheduleDate(e.target.value)} /></label>
            <label><span>Time</span><input type="time" value={scheduleTime} onChange={(e)=>setScheduleTime(e.target.value)} /></label>
            <label><span>Location</span><input value={scheduleLocation} onChange={(e)=>setScheduleLocation(e.target.value)} placeholder="Optional location" /></label>
          </div>
          <footer><button onClick={()=>setCalendarPractice(null)}>Cancel</button><button className="primaryPlanBtn" disabled={!scheduleDate} onClick={confirmSchedulePractice}>Add to Calendar</button></footer>
        </section>
      </div>}

      {selected && <Detail item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}


function PracticePlanCard({ plan, replaceIndex, setReplaceIndex, replacementOptions, updatePlanSegment, replacePracticeDrill, savePracticePlan, schedulePractice, onClose }) {
  const approvedCount = plan.segments.filter(s => !s.drill || s.status === 'approved' || s.locked).length;
  return <section className="practicePlanCard">
    <header className="planHero">
      <div>
        <small>COACHVAULT PRACTICE PLAN • REVIEW AT A GLANCE</small>
        <h2>{plan.title}</h2>
        <p>{plan.focus}</p>
      </div>
      <div className="planHeroMeta">
        <span><b>{plan.duration}</b> min</span>
        <span><b>{plan.players}</b> players</span>
        <button onClick={onClose}>×</button>
      </div>
    </header>

    <div className="planReviewBar">
      <div><b>{approvedCount}/{plan.segments.length}</b><span>segments approved or locked</span></div>
      <p>Keep what works. Replace one drill without rebuilding the whole practice.</p>
    </div>

    <div className="planArc">
      <span>ARRIVE</span><i></i><span>TEACH</span><i></i><span>COMPETE</span><i></i><span>APPLY</span><i></i><span>REVIEW</span>
    </div>

    <div className="planTimeline">
      {plan.segments.map((segment,index)=><article key={`${segment.label}-${index}`} className={`planSegment ${segment.status || 'review'} ${segment.locked ? 'locked' : ''}`}>
        <div className="planTime"><b>{segment.minutes}</b><small>MIN</small></div>
        <div className="planSegmentBody">
          <small>{segment.label}</small>
          <h3>{segment.drill?.title || 'Coach-led review'}</h3>
          <p>{segment.drill?.summary || 'Recap the day, reinforce one coaching point, and finish with a clear takeaway.'}</p>
          {segment.drill?.primarySkill?.name && <span className="planSkill">{segment.drill.primarySkill.name}</span>}
          {segment.drill && <div className="whyChosen"><b>Why this fits</b><span>{segment.drill.primarySkill?.name || 'Vault match'} supports this practice focus and sequence.</span></div>}
        </div>

        {segment.drill ? <div className="planApproval">
          <button className={`approveDrill ${segment.status==='approved'?'selected':''}`} title="Keep this drill" onClick={()=>updatePlanSegment(index,{status:'approved'})}>✓</button>
          <button className="rejectDrill" title="Replace this drill" onClick={()=>setReplaceIndex(replaceIndex===index?null:index)}>×</button>
          <button className={`lockDrill ${segment.locked?'selected':''}`} title="Lock this drill" onClick={()=>updatePlanSegment(index,{locked:!segment.locked,status:segment.locked?'review':'approved'})}>{segment.locked?'🔒':'🔓'}</button>
        </div> : <div className="planApproval"><button className="approveDrill selected">✓</button></div>}

        {replaceIndex===index && segment.drill && <div className="replacementDrawer">
          <div><small>REPLACE THIS DRILL</small><h4>Choose another Vault option</h4><p>Only this segment changes. The rest of the practice stays intact.</p></div>
          <div className="replacementChoices">
            {replacementOptions(index).length ? replacementOptions(index).map(drill=><button key={drill.id} onClick={()=>replacePracticeDrill(index,drill)}>
              <b>{drill.title}</b><span>{drill.primarySkill?.name || 'Vault drill'}</span>
            </button>) : <span className="noReplacement">No unused Vault alternatives yet.</span>}
          </div>
        </div>}
      </article>)}
    </div>

    <footer className="planFooter">
      <div><small>BUILT FROM</small><b>{plan.segments.filter(x=>x.drill).length} approved Vault drills</b></div>
      <div className="planFooterActions">
        <button onClick={()=>window.print()}>Print Plan</button>
        <button onClick={()=>schedulePractice(plan)}>Add to Calendar</button>
        <button className="primaryPlanBtn" onClick={savePracticePlan}>Save Practice</button>
      </div>
    </footer>
  </section>
}

function PracticeCalendar({ events, savedPractices, schedulePractice, onDayClick }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year,month,1);
  const daysInMonth = new Date(year,month+1,0).getDate();
  const blanks = first.getDay();
  const cells = Array.from({length:blanks},()=>null).concat(Array.from({length:daysInMonth},(_,i)=>i+1));
  const isoForDay = (day) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  return <section className="calendarWorkspace">
    <header className="calendarHeader">
      <div><small>PRACTICE CALENDAR</small><h2>{now.toLocaleString(undefined,{month:'long',year:'numeric'})}</h2><p>Click any day to create a new practice there, or schedule an existing saved practice.</p></div>
      {!!savedPractices.length && <button onClick={()=>schedulePractice(savedPractices[0])}>+ Schedule Practice</button>}
    </header>
    <div className="calendarWeekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div>
    <div className="calendarGrid">
      {cells.map((day,i)=>{
        const dayEvents = day ? events.filter(event=>{
          const d=new Date(`${event.date}T12:00:00`);
          return d.getFullYear()===year && d.getMonth()===month && d.getDate()===day;
        }) : [];
        return <div
          className={`calendarDay ${day?'':'blank'} ${day && !dayEvents.length ? 'clickableEmptyDay' : ''}`}
          key={i}
          onClick={() => day && !dayEvents.length && onDayClick(isoForDay(day))}
          role={day && !dayEvents.length ? 'button' : undefined}
          tabIndex={day && !dayEvents.length ? 0 : undefined}
          onKeyDown={(e)=>{
            if(day && !dayEvents.length && (e.key==='Enter' || e.key===' ')) onDayClick(isoForDay(day));
          }}
        >
          {day && <><b>{day}</b>
            <div className="calendarEvents">
              {dayEvents.map(event=><article key={event.id} onClick={(e)=>e.stopPropagation()}><span>{event.time || 'Practice'}</span><strong>{event.title}</strong>{event.location&&<small>{event.location}</small>}</article>)}
            </div>
            {!dayEvents.length && <span className="emptyDayHint">＋ Create practice</span>}
          </>}
        </div>
      })}
    </div>
  </section>
}

function EngineProgress({ step, socialJobStatus='' }) {
  const stages = [
    { title: 'Acquiring source', detail: 'Opening the submitted coaching source and preparing it for analysis.' },
    { title: 'Reading coaching content', detail: 'Reading transcripts, full-video actions, on-screen text, captions, and source context.' },
    { title: 'Identifying the drill', detail: 'Comparing repeated actions and instructional evidence to identify the real teaching purpose.' },
    { title: 'Mapping skills', detail: 'Matching the primary skill and supporting components to CoachVault standards.' },
    { title: 'Building field setup', detail: 'Separating active players from waiting lines and reconstructing pre-rep positions.' },
    { title: 'Building Coach Practice Card', detail: 'Turning the source into field-ready instructions, cues, objectives, and setup.' },
    { title: 'Checking the analysis', detail: 'Reviewing evidence, confidence, and consistency before presenting the card.' }
  ];
  const current = Math.min(step, stages.length - 1);

  return <section className="engineAnalysis">
    <header className="engineAnalysisHead">
      <div>
        <small>COACHVAULT ENGINE • LIVE ANALYSIS</small>
        <h2>Building your Coach Practice Card</h2>
        <p>CoachVault is turning the submitted source into structured coaching knowledge.</p>
      </div>
      <div className="analysisSpinner"><span></span><span></span><span></span></div>
    </header>

    <div className="analysisCurrent">
      <div className="analysisPulse"></div>
      <div>
        <small>WORKING NOW</small>
        <h3>{socialJobStatus || stages[current].title}</h3>
        <p>{socialJobStatus ? 'CoachVault will keep checking this video automatically. You do not need to paste the link again.' : stages[current].detail}</p>
      </div>
    </div>

    <div className="analysisTimeline">
      {stages.map((stage, index) => (
        <div key={stage.title} className={`analysisStage ${index < current ? 'complete' : index === current ? 'active' : ''}`}>
          <span className="analysisStageIcon">{index < current ? '✓' : index + 1}</span>
          <div>
            <b>{stage.title}</b>
            <small>{index < current ? 'Complete' : index === current ? 'Analyzing…' : 'Waiting'}</small>
          </div>
        </div>
      ))}
    </div>

    <div className="analysisProgress"><span style={{width:`${Math.max(7,((current+1)/stages.length)*100)}%`}} /></div>
  </section>
}

function Review({ result, sourceMeta, diagnostics, internalMode, updateResult, updateWeighted, approve, discard }) {
  const primary = result.primarySkill || { name: '', weight: 0, reason: '' };
  return <section className="review">
    <header className="reviewHead">
      <div><span>REVIEW & CONFIRM</span><h2>Review the Coach Practice Card.</h2><p>Confirm the field-ready instructions and the Engine analysis before approval.</p></div>
      <div className="confidence"><small>ENGINE CONFIDENCE</small><b>{formatConfidence(result.confidence?.overall)}%</b><p>{result.confidence?.notes || ''}</p></div>
    </header>

    {sourceMeta && <div className="source socialSourceCard">
      {sourceMeta.thumbnail && <img src={sourceMeta.thumbnail} alt="" />}
      <div>
        <small>{sourceMeta.platform ? `${sourceMeta.platform.toUpperCase()} SOURCE` : 'SOURCE'}</small>
        <b>{sourceMeta.title || sourceMeta.platform || 'Submitted source'}</b>
        <span>{sourceMeta.author || ''}</span>
        {sourceMeta.accessStatus && <em>{sourceMeta.accessStatus}</em>}
      </div>
    </div>}

    <section className="resultSnapshot">
      <div>
        <small>PRIMARY SKILL</small>
        <h3>{primary.name || 'Needs review'}</h3>
        <p>{primary.reason || 'CoachVault did not provide a reason.'}</p>
      </div>
      <div className="snapshotScore"><b>{primary.weight || 0}</b><span>relevance</span></div>
      <div className="snapshotComponents">
        {(result.skillComponents || []).slice(0, 5).map((item) => <span key={item.name}><b>{item.weight}</b>{item.name}</span>)}
      </div>
    </section>



    <CoachPracticeCard item={result} editable updateResult={updateResult} compact />

    <div className="reviewGrid">
      <div className="reviewMain">
        <Field label="Drill title"><input value={result.title || ''} onChange={(e) => updateResult('title', e.target.value)} /></Field>
        <Field label="Summary"><textarea value={result.summary || ''} onChange={(e) => updateResult('summary', e.target.value)} /></Field>
        <Field label="Teaching method"><select value={result.teachingMethod || 'Drill'} onChange={(e) => updateResult('teachingMethod', e.target.value)}>{['Individual Technique','Partner Activity','Station','Competitive Drill','Small-Sided Competition','Small-Sided Game','Team Activity','Progression','Film / Demonstration','Other'].map(x => <option key={x}>{x}</option>)}</select></Field>

        <section className="primarySkill">
          <small>PRIMARY SKILL</small>
          <div className="primaryRow">
            <input value={primary.name} onChange={(e) => updateResult('primarySkill.name', e.target.value)} />
            <strong>{primary.weight}</strong>
          </div>
          <input type="range" min="0" max="100" value={primary.weight} onChange={(e) => updateResult('primarySkill.weight', Number(e.target.value))} />
          <textarea value={primary.reason || ''} onChange={(e) => updateResult('primarySkill.reason', e.target.value)} />
        </section>

        <Weighted title="Skill Components" subtitle="The teachable parts of the primary skill" group="skillComponents" items={result.skillComponents || []} update={updateWeighted} />
        <Weighted title="Supporting Skills" subtitle="Meaningful outcomes that are not the central purpose" group="supportingSkills" items={result.supportingSkills || []} update={updateWeighted} />
        <Weighted title="Incidental Actions" subtitle="Actions present in the drill but normally excluded from classification" group="incidentalActions" items={result.incidentalActions || []} update={updateWeighted} showReason />

        <section className="section">
          <small>LEARNING OBJECTIVES</small>
          <textarea value={(result.learningObjectives || []).join('\n')} onChange={(e) => updateResult('learningObjectives', e.target.value.split('\n').filter(Boolean))} />
        </section>

        <section className="section">
          <small>EVIDENCE</small>
          {(result.evidence || []).map((e, i) => <div className="evidence" key={i}><b>{e.location || `Evidence ${i+1}`}</b><p>{e.text}</p></div>)}
        </section>
      </div>

      <aside className="reviewSide">
        <Field label="Vault folder"><select value={result.folder || 'Skills'} onChange={(e) => updateResult('folder', e.target.value)}>{['Skills','Offense','Defense','Transition','Goalie','Faceoffs','Practice Plans','Culture','Player Development','Unfiled'].map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Original source link"><input value={result.sourceUrl || sourceMeta?.url || ''} onChange={(e) => updateResult('sourceUrl', e.target.value)} placeholder="Original video, article, or document link" /></Field>
        <Field label="Players"><input value={result.setup?.players || ''} onChange={(e) => updateResult('setup.players', e.target.value)} /></Field>
        <Field label="Duration"><input type="number" value={result.setup?.duration || ''} onChange={(e) => updateResult('setup.duration', Number(e.target.value))} /></Field>
        <Field label="Equipment"><textarea value={(result.setup?.equipment || []).join(', ')} onChange={(e) => updateResult('setup.equipment', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} /></Field>
        <Field label="Space"><input value={result.setup?.space || ''} onChange={(e) => updateResult('setup.space', e.target.value)} /></Field>
        <Field label="Age suitability"><input value={(result.setup?.age || []).join(', ')} onChange={(e) => updateResult('setup.age', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} /></Field>
        <ListBlock title="Coaching Cues" items={result.coachingCues || []} path="coachingCues" updateResult={updateResult} />
        <ListBlock title="Common Mistakes" items={result.commonMistakes || []} path="commonMistakes" updateResult={updateResult} />
        <ListBlock title="Constraints" items={result.constraints || []} path="constraints" updateResult={updateResult} />
      </aside>
    </div>


    {internalMode && <DebugPanel diagnostics={diagnostics} result={result} />}

    <footer><button className="discard" onClick={discard}>Discard</button><button className="approve" onClick={approve}>Approve Coach Practice Card</button></footer>
  </section>
}


function DebugPanel({ diagnostics, result }) {
  const [open, setOpen] = useState(false);
  const stages = diagnostics?.stages || [];
  const checks = diagnostics?.fieldChecks || [];
  const missing = diagnostics?.missingFields || [];

  return <section className="debugPanel">
    <button className="debugToggle" onClick={() => setOpen(!open)}>
      <span><b>Engine Debug Panel</b><small>Internal only · shows what the Engine returned before approval</small></span>
      <strong>{open ? 'Hide' : 'Show'}</strong>
    </button>

    {open && <div className="debugBody">
      <div className="debugSummary">
        <article><small>PIPELINE</small><b>{stages.filter(x => x.status === 'pass').length}/{stages.length || 0}</b><span>stages passed</span></article>
        <article><small>SCHEMA</small><b>{checks.filter(x => x.status === 'pass').length}/{checks.length || 0}</b><span>required fields passed</span></article>
        <article className={missing.length ? 'warn' : 'good'}><small>MISSING</small><b>{missing.length}</b><span>{missing.length ? 'fields need attention' : 'required fields'}</span></article>
      </div>

      <div className="debugColumns">
        <div>
          <h3>Pipeline stages</h3>
          <div className="stageList">
            {stages.map((stage, i) => <div className={`stage ${stage.status}`} key={`${stage.name}-${i}`}>
              <span className="stageIcon">{stage.status === 'pass' ? '✓' : stage.status === 'warn' ? '!' : '×'}</span>
              <div><b>{stage.name}</b><p>{stage.detail}</p></div>
            </div>)}
          </div>
        </div>

        <div>
          <h3>Structured-field checks</h3>
          <div className="stageList">
            {checks.map((check, i) => <div className={`stage ${check.status}`} key={`${check.field}-${i}`}>
              <span className="stageIcon">{check.status === 'pass' ? '✓' : '!'}</span>
              <div><b>{check.field}</b><p>{check.detail}</p></div>
            </div>)}
          </div>
        </div>
      </div>

      {missing.length > 0 && <div className="missingBox"><b>Why the database card may look incomplete</b><p>The Engine returned no usable value for: {missing.join(', ')}. Review or rerun the source before approval.</p></div>}

      <details className="rawJson">
        <summary>View raw Engine JSON</summary>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </details>

      <details className="rawJson">
        <summary>View diagnostic metadata</summary>
        <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
      </details>
    </div>}
  </section>
}

function Weighted({ title, subtitle, group, items, update, showReason=false }) {
  return <section className="section"><small>{title.toUpperCase()}</small><p>{subtitle}</p>{items.map((x, i) => <div className="weighted" key={i}><input value={x.name || ''} onChange={(e) => update(group, i, 'name', e.target.value)} /><b>{x.weight || 0}</b><input type="range" min="0" max="100" value={x.weight || 0} onChange={(e) => update(group, i, 'weight', e.target.value)} /><textarea className="weightReason" value={x.reason || ''} onChange={(e) => update(group, i, 'reason', e.target.value)} placeholder="Why did this earn this score?" /></div>)}</section>
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }

function ListBlock({ title, items, path, updateResult }) {
  return <div className="listBlock"><small>{title.toUpperCase()}</small><textarea value={items.join('\n')} onChange={(e) => updateResult(path, e.target.value.split('\n').filter(Boolean))} /></div>
}

function DrillCard({ item, onClick }) {
  const practiceCard = practiceCardFor(item);
  return <article className="card" onClick={onClick}><header><span>{item.folder || suggestedFolderFor(item)}</span><small>{item.sourceType}</small></header><h3>{item.title}</h3><p>{practiceCard.purpose || item.summary}</p><div className="cardType">COACH PRACTICE CARD</div><div className="primaryTag"><b>{item.primarySkill?.weight}</b>{item.primarySkill?.name}</div><div className="pills">{(item.skillComponents || []).slice(0,4).map(x => <span key={x.name}>{x.name} {x.weight}</span>)}</div><footer><b>{item.teachingMethod}</b><span>{item.updated}</span></footer></article>
}

function Detail({ item, onClose }) {
  const [tab, setTab] = useState('practice');
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="detailOverlay" onClick={onClose}>
    <button className="fixedDetailClose" onClick={onClose} aria-label="Close drill details">×</button>
    <article className="detailDrawer" onClick={(e) => e.stopPropagation()}>
      <header className="detailHeader">
        <div>
          <span>{(item.folder || suggestedFolderFor(item)).toUpperCase()} · APPROVED DRILL</span>
          <h2>{item.title}</h2>
        </div>
      </header>

      <nav className="detailTabs">
        <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>Coach Practice Card</button>
        <button className={tab === 'analysis' ? 'active' : ''} onClick={() => setTab('analysis')}>Engine Analysis</button>
      </nav>

      <div className="detailBody">
        {tab === 'practice' ? <CoachPracticeCard item={item} /> : <EngineAnalysis item={item} />}
      </div>

      <footer className="detailFooter">
        {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">View source</a>}
        <button onClick={() => window.print()}>Print card</button>
        <button onClick={onClose}>Done</button>
      </footer>
    </article>
  </div>
}

function SourceBadge({ value }) {
  return <small className={`sourceBadge ${String(value || '').toLowerCase().replace(/\s+/g, '-')}`}>{provenanceLabel(value)}</small>;
}

function SetupValue({ label, item }) {
  const value = item?.value;
  const display = Array.isArray(value) ? value.join(', ') : value;
  return <article><div><small>{label}</small><b>{display || 'Not stated'}</b></div><SourceBadge value={item?.source} /></article>;
}

function CardList({ title, items, ordered=false }) {
  if (!items?.length) return null;
  const Tag = ordered ? 'ol' : 'ul';
  const clean = (value) => ordered ? String(value).replace(/^\s*\d+[.)-]\s*/, '') : value;
  return <section className="practiceSection"><h3>{title}</h3><Tag>{items.map((x, i) => <li key={`${title}-${i}`}>{clean(x)}</li>)}</Tag></section>;
}


function FieldDiagram({ layout }) {
  if (!layout) return <div className="fieldDiagramEmpty">No field layout available.</div>;
  const canvas = layout.canvas || 'half-field';
  const viewBox = canvas === 'full-field' ? '-16 -16 132 192' : canvas === 'small-grid' ? '-14 -14 128 128' : '-16 -16 132 152';
  const height = canvas === 'full-field' ? 560 : 455;
  const resolvePoint = (ref) => { if (!ref) return {x:50,y:50}; if (typeof ref === 'string') { const f=(layout.players||[]).find(p=>p.id===ref||p.label===ref); if(f) return {x:Number(f.x),y:Number(f.y)};} return {x:Number(ref.x??50),y:Number(ref.y??50)}; };
  const roleClass=(r)=>r==='defense'?'diagramDefense':r==='goalie'?'diagramGoalie':'diagramOffense';
  return <section className="fieldDiagramWrap">
    <div className="fieldDiagramHeader"><div><small>FIELD SETUP</small><b>{canvas.replace('-', ' ')}</b></div><span className={`confidenceBadge ${String(layout.confidence||'Estimated').toLowerCase().replace(' ','')}`}>{layout.confidence||'Estimated'}</span></div>
    <svg className={`fieldDiagram ${canvas}`} viewBox={viewBox} style={{height}} role="img" aria-label="Coach Practice Card field setup">
      <defs><marker id="arrowSolid" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" /></marker><marker id="arrowDash" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" /></marker></defs>
      <rect x="2" y="2" width="96" height={canvas==='full-field'?'156':canvas==='small-grid'?'96':'116'} rx="3" className="fieldBoundary"/>
      <image href="/coachvault-logo.png" x="25" y={canvas==='full-field'?'55':'38'} width="50" height="45" opacity="0.055" preserveAspectRatio="xMidYMid meet" className="diagramWatermark"/>
      {canvas==='full-field'&&<><line x1="50" y1="2" x2="50" y2="158" className="fieldCenterLine"/><circle cx="50" cy="80" r="8" className="fieldCenterCircle"/></>}
      {(canvas==='half-field'||canvas==='crease-area'||canvas==='full-field')&&<><circle cx="50" cy="22" r="8" className="goalCrease"/><path d="M46 24 L54 24 L50 17 Z" className="goalTriangle"/></>}{(canvas==='half-field'||canvas==='crease-area')&&<line x1="2" y1="52" x2="98" y2="52" className="restrainingLine"/>}
      {canvas==='full-field'&&<><circle cx="50" cy="138" r="8" className="goalCrease"/><path d="M46 136 L54 136 L50 143 Z" className="goalTriangle"/></>}
      {(layout.cones||[]).map((c,i)=>{const x=Number(c.x??50),y=Number(c.y??50);return <path key={`cone-${i}`} d={`M${x} ${y-3.5} L${x-3} ${y+3.5} L${x+3} ${y+3.5} Z`} className="diagramCone"/>})}
      {(layout.balls||[]).map((b,i)=><circle key={`ball-${i}`} cx={Number(b.x??50)} cy={Number(b.y??50)} r="1.7" className="diagramBall"/>)}
      {layout.coach&&<g className="diagramCoach"><rect x={Number(layout.coach.x??50)-4} y={Number(layout.coach.y??90)-4} width="8" height="8" rx="1"/><text x={Number(layout.coach.x??50)} y={Number(layout.coach.y??90)+1.5} textAnchor="middle">C</text></g>}
      {(layout.players||[]).map((p,i)=>{const x=Number(p.x??50),y=Number(p.y??50),label=p.id||p.label||'';if(p.role==='goalie')return <g key={i} className="diagramPlayer"><rect x={x-4} y={y-4} width="8" height="8" rx="1.5" className={roleClass(p.role)}/><text x={x} y={y+1.5} textAnchor="middle">{label||'G'}</text></g>;if(p.stationType==='line' || ['waiting','entry','offensive-entry','defensive-entry','rotation','feeding'].includes(p.lineRole)){const left=x<=12,right=x>=88,top=y<=14,bottom=(canvas==='full-field'?y>=146:y>=106);const dir=left?'left':right?'right':top?'up':bottom?'down':(p.queueDirection||'none');const offsets=dir==='up'?[[0,-7],[0,-12.5]]:dir==='down'?[[0,7],[0,12.5]]:dir==='left'?[[-7,0],[-12.5,0]]:dir==='right'?[[7,0],[12.5,0]]:dir==='up-left'?[[-5,-5],[-9,-9]]:dir==='up-right'?[[5,-5],[9,-9]]:dir==='down-left'?[[-5,5],[-9,9]]:dir==='down-right'?[[5,5],[9,9]]:[];return <g key={i} className="diagramPlayer diagramLineStation"><circle cx={x} cy={y} r="4.5" className={roleClass(p.role)}/>{offsets.map((o,q)=><circle key={q} cx={x+o[0]} cy={y+o[1]} r={q===0?3.4:2.6} className={`${roleClass(p.role)} diagramQueue`}/>) }<text x={x} y={y+1.5} textAnchor="middle">{label}</text></g>}return <g key={i} className="diagramPlayer"><circle cx={x} cy={y} r="4.5" className={roleClass(p.role)}/><text x={x} y={y+1.5} textAnchor="middle">{label}</text></g>})}
    </svg>
    <div className="fieldLegend"><span><i className="legendCircle offense"></i>Offense</span><span><i className="legendCircle defense"></i>Defense</span><span><i className="legendSquare coach"></i>Coach</span><span><i className="legendBall"></i>Ball</span><span><i className="legendCone"></i>Cone</span></div>
    {layout.notes&&<p className="fieldDiagramNotes">{layout.notes}</p>}
  </section>;
}

function CoachPracticeCard({ item, editable=false, updateResult, compact=false }) {
  const card = practiceCardFor(item);
  const setup = card.setup || {};
  return <section className={`coachPracticeCard ${compact ? 'compact' : ''}`}>
    <header className="practiceHero">
      <div><small>COACH PRACTICE CARD</small><h2>{item.title || 'Untitled Drill'}</h2><p>{card.purpose || item.summary}</p></div>
      <div className="practiceMeta"><span>{item.primarySkill?.name || 'Skill pending'}</span><b>{item.primarySkill?.weight || 0}</b></div>
    </header>

    <CardList title="When to Use" items={card.whenToUse} />

    <section className="practiceSection">
      <h3>Setup</h3>
      <div className="setupGrid">
        <SetupValue label="Players" item={setup.players} />
        <SetupValue label="Groups" item={setup.groups} />
        <SetupValue label="Equipment" item={setup.equipment} />
        <SetupValue label="Space" item={setup.space} />
        <SetupValue label="Time" item={setup.time} />
        <SetupValue label="Rotation" item={setup.rotation} />
      </div>
    </section>

    <FieldDiagram layout={card.fieldLayout} />

    <CardList title="Run the Drill" items={card.runTheDrill} ordered />

    <div className="practiceColumns">
      <CardList title="Coach Focus" items={card.coachFocus} />
      <CardList title="Watch For" items={card.watchFor} />
    </div>

    <div className="practiceColumns">
      <CardList title="Make It Easier" items={card.makeEasier} />
      <CardList title="Make It Harder" items={card.makeHarder} />
    </div>

    <div className="practiceColumns">
      <CardList title="Prerequisites" items={card.prerequisites} />
      <CardList title="Avoid If" items={card.avoidIf} />
    </div>

    <CardList title="Success Criteria" items={card.successCriteria} />

    <section className="practiceSection coachNotes">
      <h3>Coach Notes</h3>
      {editable ? <textarea value={card.notes || ''} onChange={(e) => updateResult('coachPracticeCard.notes', e.target.value)} placeholder="Add your own practice notes..." /> : <p>{card.notes || 'No coach notes yet.'}</p>}
    </section>
  </section>
}

function EngineAnalysis({ item }) {
  return <section className="engineAnalysisView">
    <p className="detailSummary">{item.summary}</p>
    {item.sourceUrl && <a className="sourceLink detailSourceLink" href={item.sourceUrl} target="_blank" rel="noreferrer">Open original source</a>}
    <section className="detailSection"><h3>Primary Skill</h3><div className="primaryTag large"><b>{item.primarySkill?.weight}</b>{item.primarySkill?.name}</div>{item.primarySkill?.reason && <p>{item.primarySkill.reason}</p>}</section>
    <section className="detailSection"><h3>Skill Components</h3><div className="detailComponents">{(item.components || item.skillComponents || []).map((component) => <article key={component.name}><div className="componentScore"><b>{component.weight}</b><span>{component.name}</span></div>{component.reason && <p>{component.reason}</p>}{component.objectives?.length > 0 && <div className="objectiveList"><small>OBJECTIVES</small>{component.objectives.map((objective) => <div key={objective.name}><b>{objective.weight}</b><span>{objective.name}</span>{objective.reason && <p>{objective.reason}</p>}</div>)}</div>}</article>)}</div></section>
    <section className="detailSection"><h3>Learning Objectives</h3><ul>{(item.learningObjectives || []).map(x => <li key={x}>{x}</li>)}</ul></section>
    <section className="detailSection twoColumnDetail"><div><h3>Coaching Cues</h3><ul>{(item.coachingCues || []).map(x => <li key={x}>{x}</li>)}</ul></div><div><h3>Common Mistakes</h3><ul>{(item.commonMistakes || []).map(x => <li key={x}>{x}</li>)}</ul></div></section>
    {item.evidence?.length > 0 && <section className="detailSection"><h3>Source Evidence</h3>{item.evidence.map((e, i) => <div className="evidence" key={i}><b>{e.location || `Evidence ${i + 1}`}</b><p>{e.text}</p></div>)}</section>}
  </section>
}


function CVILLibrary({ selectedSkillId, setSelectedSkillId }) {
  const selected = CVIL.find((skill) => skill.id === selectedSkillId) || CVIL[0];

  return <>
    <section className="cvilTopStrip">
      <div>
        <small>COACHVAULT INTELLIGENCE LIBRARY</small>
        <h2>{CVIL.length} Skill Standards</h2>
      </div>
      <div className="cvilTopSkills">
        {CVIL.map((skill) => <button key={skill.id} className={selected?.id === skill.id ? 'active' : ''} onClick={() => setSelectedSkillId(skill.id)}>
          {skill.name}
        </button>)}
      </div>
    </section>

    <section className="cvilPage">
      <aside className="cvilSidebar">
      <div>
        <small>COACHVAULT INTELLIGENCE LIBRARY</small>
        <h2>CVIL v1</h2>
        <p>The structured coaching knowledge that powers the Engine.</p>
      </div>
      <div className="skillList">
        {CVIL.map((skill) => <button key={skill.id} className={selected?.id === skill.id ? 'active' : ''} onClick={() => setSelectedSkillId(skill.id)}>
          <span>{skill.name}</span><small>{skill.components.length} components</small>
        </button>)}
      </div>
    </aside>

    <article className="standardPage">
      <header>
        <span>{selected.category}</span>
        <h2>{selected.name}</h2>
        <p className="standardDefinition">{selected.definition}</p>
        <div className="standardPrinciple"><small>COACHVAULT PRINCIPLE</small><b>{selected.coachPrinciple}</b></div>
      </header>

      <section className="standardOverview">
        <div><small>PURPOSE</small><p>{selected.purpose}</p></div>
        <div><small>SKILL ARCHITECTURE</small><p>{selected.components.map(x => x.name).join(' → ')}</p></div>
      </section>

      <div className="componentStack">
        {selected.components.map((component, index) => <details key={component.id} open={index === 0}>
          <summary><span>{String(index + 1).padStart(2, '0')}</span><div><b>{component.name}</b><small>{component.purpose}</small></div><strong>{component.objectives.length} objective{component.objectives.length === 1 ? '' : 's'}</strong></summary>
          <div className="componentBody">
            {component.objectives.map((objective) => <section className="objectiveCard" key={objective.id}>
              <h4>{objective.name}</h4>
              <div className="objectiveGrid">
                <div><small>OBSERVABLE BEHAVIORS</small><ul>{objective.observableBehaviors.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><small>COACHING CUES</small><ul>{objective.coachingCues.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><small>COMMON MISTAKES</small><ul>{objective.commonMistakes.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><small>CORRECTIONS</small><ul>{objective.corrections.map(x => <li key={x}>{x}</li>)}</ul></div>
              </div>
              <div className="progressionLine"><small>PROGRESSION</small><span>{objective.progressions.join(' → ')}</span></div>
            </section>)}
          </div>
        </details>)}
      </div>
    </article>
  </section>
  </>
}

function Framework() {
  return <section className="framework"><span>SKILL FRAMEWORK 001</span><h2>Ground Balls</h2><p className="lead">{skillFramework.definition}</p><h3>Skill Components</h3><div className="frameworkGrid">{skillFramework.components.map((x, i) => <article key={x}><b>{String(i+1).padStart(2,'0')}</b><h4>{x}</h4><p>A standardized component the Engine may identify and weight when it is intentionally developed.</p></article>)}</div><div className="rule"><b>Engine Rule</b><p>{skillFramework.purposeRule}</p></div></section>
}

function TestResults({ drills }) {
  const reviewed = drills.filter(x => x.sourceType !== 'CoachVault Foundation');
  return <section className="framework"><span>ENGINE EVALUATION</span><h2>Atlas Test Results</h2><p className="lead">Use the same sources repeatedly while refining the Engine. The goal is consistent skill classification, not longer output.</p><div className="metrics"><article><b>{reviewed.length}</b><span>Sources tested</span></article><article><b>{drills.length}</b><span>Approved drills</span></article><article><b>{reviewed.length ? Math.round(reviewed.reduce((s,x)=>s+(x.confidence?.overall||0),0)/reviewed.length) : 0}%</b><span>Average confidence</span></article></div><h3>Manual evaluation questions</h3><ol><li>Did the Engine identify the drill's true primary skill?</li><li>Did it identify the right skill components?</li><li>Did it avoid tagging incidental actions?</li><li>Did the evidence support the classification?</li><li>Would the approved data help assemble a practice?</li></ol></section>
}
