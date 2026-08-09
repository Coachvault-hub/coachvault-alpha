'use client';

export const PHASES = [
  'Preseason Setup',
  'Equipment & Apparel',
  'Season Planning',
  'Team Management',
  'In Season',
  'Postseason'
];

export const FIELD_TYPES = [
  {value:'short_text', label:'Short answer'},
  {value:'long_text', label:'Long answer'},
  {value:'number', label:'Number'},
  {value:'date', label:'Date'},
  {value:'select', label:'Dropdown'},
  {value:'radio', label:'Multiple choice'},
  {value:'checkboxes', label:'Checkboxes'},
  {value:'acknowledgement', label:'Acknowledgement'}
];

export const FORM_TEMPLATES = [
  {
    id:'coach-bio-template',
    name:'Coach Profile & Bio',
    description:'Collect coach background, experience, certifications, and apparel sizing.',
    fields:[
      {id:'name', type:'short_text', label:'Full name', required:true},
      {id:'experience', type:'long_text', label:'Coaching experience', required:true},
      {id:'certifications', type:'short_text', label:'Certifications', required:false},
      {id:'shirt', type:'select', label:'Shirt size', required:true, options:['S','M','L','XL','2XL','3XL']},
      {id:'bio', type:'long_text', label:'Short coach bio', required:true}
    ]
  },
  {
    id:'helmet-template',
    name:'Helmet Ordering',
    description:'Collect team helmet quantity and sizing needs.',
    fields:[
      {id:'team', type:'short_text', label:'Team', required:true},
      {id:'quantity', type:'number', label:'Number of helmets needed', required:true},
      {id:'sizes', type:'long_text', label:'Sizes / player breakdown', required:true},
      {id:'notes', type:'long_text', label:'Notes', required:false},
      {id:'confirm', type:'acknowledgement', label:'I confirm this order is accurate.', required:true}
    ]
  },
  {
    id:'tournament-template',
    name:'Tournament Selection',
    description:'Collect tournament preferences, conflicts, and travel expectations.',
    fields:[
      {id:'team', type:'short_text', label:'Team', required:true},
      {id:'first', type:'short_text', label:'First tournament preference', required:true},
      {id:'second', type:'short_text', label:'Second tournament preference', required:false},
      {id:'travel', type:'radio', label:'Travel tolerance', required:true, options:['Local only','Up to 90 minutes','Up to 3 hours','Overnight travel is OK']},
      {id:'conflicts', type:'long_text', label:'Known conflicts / blackout dates', required:false},
      {id:'notes', type:'long_text', label:'Additional notes', required:false}
    ]
  },
  {
    id:'availability-template',
    name:'Practice Availability',
    description:'Collect preferred practice days and coach conflicts.',
    fields:[
      {id:'team', type:'short_text', label:'Team', required:true},
      {id:'days', type:'checkboxes', label:'Preferred practice days', required:true, options:['Monday','Tuesday','Wednesday','Thursday','Friday']},
      {id:'conflicts', type:'long_text', label:'Coach conflicts / restrictions', required:false},
      {id:'notes', type:'long_text', label:'Other scheduling notes', required:false}
    ]
  }
];

export const DEFAULT_ROADMAP = [
  {id:'roadmap-coach-profile', phase:'Preseason Setup', title:'Coach Profile & Bio', type:'Form', due:'Before team launch', audience:'All coaches', required:true, description:'Tell the club who you are, your experience, certifications, and apparel sizing.', formTemplateId:'coach-bio-template'},
  {id:'roadmap-helmet', phase:'Equipment & Apparel', title:'Helmet Ordering', type:'Form', due:'Before equipment deadline', audience:'Head coaches', required:true, description:'Submit team helmet quantities, sizes, and ordering notes.', formTemplateId:'helmet-template'},
  {id:'roadmap-tournament', phase:'Season Planning', title:'Tournament Selection', type:'Form', due:'Before schedule lock', audience:'Head coaches', required:true, description:'Submit tournament preferences, blackout dates, and travel tolerance.', formTemplateId:'tournament-template'},
  {id:'roadmap-practice', phase:'Season Planning', title:'Practice Availability', type:'Form', due:'Before field scheduling', audience:'Head coaches', required:true, description:'Submit preferred practice days and coach conflicts.', formTemplateId:'availability-template'},
  {id:'roadmap-parent', phase:'Team Management', title:'Parent Meeting Guide', type:'Document', due:'Before parent meeting', audience:'All coaches', required:false, description:'Review attendance, communication, sideline, and season expectations.', url:''},
  {id:'roadmap-midseason', phase:'In Season', title:'Midseason Coach Check-In', type:'Task', due:'Midseason', audience:'All coaches', required:false, description:'Review roster, schedule, player development, and support needs.', url:''},
  {id:'roadmap-postseason', phase:'Postseason', title:'Season Review', type:'Task', due:'End of season', audience:'Head coaches', required:false, description:'Capture what worked, what should change, and next-season recommendations.', url:''},
];

export function readLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}

export function writeLocal(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function templateById(id) {
  return FORM_TEMPLATES.find(t => t.id === id) || null;
}
