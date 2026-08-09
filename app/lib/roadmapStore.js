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
  {value:'email', label:'Email'},
  {value:'phone', label:'Phone'},
  {value:'number', label:'Number'},
  {value:'date', label:'Date'},
  {value:'time', label:'Time'},
  {value:'select', label:'Dropdown'},
  {value:'radio', label:'Multiple choice'},
  {value:'checkboxes', label:'Checkboxes'},
  {value:'yes_no', label:'Yes / No'},
  {value:'scale', label:'Rating scale'},
  {value:'acknowledgement', label:'Acknowledgement'},
  {value:'section', label:'Section heading'}
];

export const FORM_TEMPLATES = [
  {
    id:'coach-bio-template',
    name:'Coach Profile & Bio',
    description:'Collect coach background, certifications, contact preferences, and apparel sizing.',
    fields:[
      {id:'intro', type:'section', label:'Coach Information', required:false},
      {id:'name', type:'short_text', label:'Full name', required:true},
      {id:'email', type:'email', label:'Preferred email', required:true},
      {id:'phone', type:'phone', label:'Mobile phone', required:true},
      {id:'experience', type:'long_text', label:'Tell us about your coaching experience', required:true},
      {id:'certified', type:'yes_no', label:'Are you currently USA Lacrosse certified?', required:true},
      {id:'cert-details', type:'short_text', label:'Certification level / expiration', required:true,
       logic:{enabled:true,fieldId:'certified',operator:'equals',value:'Yes'}},
      {id:'shirt', type:'select', label:'Shirt size', required:true, options:['S','M','L','XL','2XL','3XL']},
      {id:'bio', type:'long_text', label:'Short coach bio for the program website', required:true},
      {id:'confirm', type:'acknowledgement', label:'I confirm the information above is accurate.', required:true}
    ]
  },
  {
    id:'helmet-template',
    name:'Helmet Ordering',
    description:'Collect team helmet inventory, player needs, and order details.',
    fields:[
      {id:'team-info', type:'section', label:'Team & Inventory', required:false},
      {id:'team', type:'short_text', label:'Team', required:true},
      {id:'existing', type:'number', label:'How many usable helmets do you currently have?', required:true},
      {id:'need-order', type:'yes_no', label:'Do you need to order helmets?', required:true},
      {id:'quantity', type:'number', label:'Number of helmets needed', required:true,
       logic:{enabled:true,fieldId:'need-order',operator:'equals',value:'Yes'}},
      {id:'sizes', type:'long_text', label:'List sizes / player breakdown', required:true,
       logic:{enabled:true,fieldId:'need-order',operator:'equals',value:'Yes'}},
      {id:'custom', type:'yes_no', label:'Are there any special/custom order needs?', required:true},
      {id:'custom-notes', type:'long_text', label:'Describe the custom order needs', required:true,
       logic:{enabled:true,fieldId:'custom',operator:'equals',value:'Yes'}},
      {id:'notes', type:'long_text', label:'Additional notes', required:false},
      {id:'confirm', type:'acknowledgement', label:'I confirm this order is accurate.', required:true}
    ]
  },
  {
    id:'tournament-template',
    name:'Tournament Selection',
    description:'Collect tournament preferences, travel tolerance, conflicts, and priorities.',
    fields:[
      {id:'team', type:'short_text', label:'Team', required:true},
      {id:'priority', type:'radio', label:'What is the team’s primary tournament goal?', required:true,
       options:['Competitive challenge','Player development','Local / low travel','Team bonding / destination']},
      {id:'travel', type:'radio', label:'Travel tolerance', required:true,
       options:['Local only','Up to 90 minutes','Up to 3 hours','Overnight travel is OK']},
      {id:'overnight', type:'yes_no', label:'Would your team consider an overnight tournament?', required:true},
      {id:'overnight-notes', type:'long_text', label:'Any overnight travel limitations?', required:false,
       logic:{enabled:true,fieldId:'overnight',operator:'equals',value:'Yes'}},
      {id:'first', type:'short_text', label:'First tournament preference', required:true},
      {id:'second', type:'short_text', label:'Second tournament preference', required:false},
      {id:'conflicts', type:'long_text', label:'Known conflicts / blackout dates', required:false},
      {id:'confidence', type:'scale', label:'How confident are you in these selections?', required:true, scaleMin:1, scaleMax:5},
      {id:'notes', type:'long_text', label:'Additional notes for the director', required:false}
    ]
  },
  {
    id:'availability-template',
    name:'Practice Availability',
    description:'Collect preferred practice days, restrictions, and coach conflicts.',
    fields:[
      {id:'team', type:'short_text', label:'Team', required:true},
      {id:'days', type:'checkboxes', label:'Preferred practice days', required:true, options:['Monday','Tuesday','Wednesday','Thursday','Friday']},
      {id:'earliest', type:'time', label:'Earliest available start time', required:false},
      {id:'latest', type:'time', label:'Latest acceptable end time', required:false},
      {id:'restrictions', type:'yes_no', label:'Do you have recurring coach conflicts or restrictions?', required:true},
      {id:'conflicts', type:'long_text', label:'Describe your recurring conflicts / restrictions', required:true,
       logic:{enabled:true,fieldId:'restrictions',operator:'equals',value:'Yes'}},
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
