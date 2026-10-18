'use strict';
// Content model for the whole site. The admin panel builds its forms from
// these definitions and the server validates submissions against them.
//
// Field types: text, textarea, markdown, number, date, select, url, email,
// slug, list (one item per line), image, file, images (several images with
// captions), ref (pick an item from another collection), boolean.

const DOCUMENT_CATEGORIES = ['TAF', 'Proposal Documents', 'Checklist Documents', 'Presentations', 'Research Papers', 'Demo Videos', 'Testing', 'Thesis', 'Other'];
const GALLERY_CATEGORIES = ['Field visits', 'Development', 'Team', 'Events', 'Presentations'];
const MEMBER_TYPES = ['Team member', 'Supervisor', 'Co-supervisor', 'External supervisor'];

const collections = {
  domain: {
    label: 'Domain',
    singular: 'domain section',
    intro: 'Sections of the Domain page: literature survey, research gap, research problem, objectives, methodology and technologies.',
    titleField: 'title',
    listColumns: [{ field: 'slug', label: 'Anchor', format: 'mono' }, { field: 'itemsStyle', label: 'Key points shown as' }],
    publicPath: (item) => `/domain#${item.slug}`,
    fields: [
      { name: 'title', label: 'Heading', type: 'text', required: true, maxLength: 120 },
      { name: 'slug', label: 'Anchor', type: 'slug', from: 'title', help: 'Used in links such as /domain#research-gap. Letters, numbers and dashes.' },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 2, help: 'One or two sentences shown under the heading.' },
      { name: 'body', label: 'Content', type: 'markdown', rows: 14 },
      { name: 'items', label: 'Key points', type: 'list', rows: 7, help: 'One per line. Write "Title | description" to give a point its own heading.' },
      { name: 'itemsStyle', label: 'Show key points as', type: 'select', default: 'cards', options: [['cards', 'Cards'], ['steps', 'Numbered steps'], ['chips', 'Technology tiles'], ['list', 'Bulleted list']] },
      { name: 'image', label: 'Figure', type: 'image' },
      { name: 'imageCaption', label: 'Figure caption', type: 'text', wide: true },
    ],
  },

  components: {
    label: 'Research components',
    singular: 'research component',
    intro: 'The four individual components. Each one gets its own page linked from Home and Domain.',
    titleField: 'title',
    listColumns: [{ field: 'member', label: 'Member', format: 'ref:members' }, { field: 'slug', label: 'Page', format: 'mono' }],
    publicPath: (item) => `/research/${item.slug}`,
    fields: [
      { name: 'title', label: 'Component title', type: 'text', required: true, maxLength: 140, wide: true },
      { name: 'slug', label: 'Page address', type: 'slug', from: 'shortTitle', help: 'The page lives at /research/<address>.' },
      { name: 'shortTitle', label: 'Short title', type: 'text', required: true, maxLength: 60, help: 'Used on cards and menus, e.g. "Quality Grading".' },
      { name: 'member', label: 'Team member', type: 'ref', collection: 'members' },
      { name: 'illustration', label: 'Illustration', type: 'select', default: 'leaf', options: [['grading', 'Quality grading'], ['disease', 'Disease detection'], ['yield', 'Yield prediction'], ['pest', 'Pest detection'], ['leaf', 'Plain leaf']] },
      { name: 'accent', label: 'Colour', type: 'select', default: 'leaf', options: [['leaf', 'Leaf green'], ['rust', 'Rust'], ['gold', 'Gold'], ['teal', 'Teal']] },
      { name: 'tagline', label: 'Tagline', type: 'textarea', rows: 2, maxLength: 300 },
      { name: 'overview', label: 'Overview points', type: 'list', rows: 7 },
      { name: 'novelty', label: 'Novelty of the component', type: 'textarea', rows: 3 },
      { name: 'models', label: 'Models and tools', type: 'list', rows: 4, help: 'One per line, e.g. EfficientNet-B0.' },
      { name: 'workflow', label: 'Workflow steps', type: 'list', rows: 8, help: 'One step per line: "Step name | what happens".' },
      { name: 'workflowNote', label: 'Workflow note', type: 'textarea', rows: 2 },
      { name: 'workflowImage', label: 'Workflow diagram', type: 'image' },
      { name: 'pp1Feedback', label: 'PP1 feedback', type: 'list', rows: 4 },
      { name: 'pp2Improvements', label: 'PP2 improvements', type: 'list', rows: 7 },
      { name: 'progressNote', label: 'Progress summary', type: 'text', wide: true, help: 'e.g. "PP1: AI model only → PP2: complete end-to-end mobile system".' },
      { name: 'results', label: 'Results and discussion', type: 'markdown', rows: 8 },
      { name: 'metrics', label: 'Result figures', type: 'list', rows: 5, help: 'One per line: "Label | value", e.g. "R² (test) | 94.48%".' },
      { name: 'screenshots', label: 'Screenshots', type: 'images' },
    ],
  },

  milestones: {
    label: 'Milestones',
    singular: 'milestone',
    intro: 'Assessments shown on the Milestones page, with date, weight and status. Use the ↑ ↓ buttons to change the order.',
    titleField: 'title',
    listColumns: [{ field: 'date', label: 'Date', format: 'date' }, { field: 'weight', label: 'Weight' }, { field: 'status', label: 'Status', format: 'status' }],
    publicPath: (item) => `/milestones#${item.slug}`,
    fields: [
      { name: 'title', label: 'Assessment', type: 'text', required: true, maxLength: 120 },
      { name: 'slug', label: 'Anchor', type: 'slug', from: 'title' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'dateText', label: 'Date as text', type: 'text', maxLength: 40, placeholder: 'e.g. January 2026', help: 'Optional. Shown instead of the date when only the month is known.' },
      { name: 'weight', label: 'Weight of the final mark', type: 'text', maxLength: 40, placeholder: 'e.g. 12%', help: 'Leave empty if this milestone has no weight.' },
      { name: 'status', label: 'Status', type: 'select', default: 'upcoming', options: [['completed', 'Completed'], ['in-progress', 'In progress'], ['upcoming', 'Upcoming']] },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 3 },
      { name: 'details', label: 'Assessment details', type: 'markdown', rows: 8 },
      { name: 'deliverables', label: 'Deliverables', type: 'list', rows: 5 },
    ],
  },

  documents: {
    label: 'Documents',
    singular: 'document',
    intro: 'Reports and forms listed on the Documents page. Upload a file or paste a link; items without either show as pending.',
    titleField: 'title',
    listColumns: [{ field: 'category', label: 'Category' }, { field: 'file', label: 'File', format: 'file' }],
    publicPath: () => '/documents',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 160, wide: true },
      { name: 'category', label: 'Category', type: 'select', default: 'Other', options: DOCUMENT_CATEGORIES.map((c) => [c, c]) },
      { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { name: 'author', label: 'Author', type: 'text', placeholder: 'Group, or a member\'s name' },
      { name: 'date', label: 'Submitted on', type: 'date' },
      { name: 'version', label: 'Version', type: 'select', default: '', options: [['', 'Not applicable'], ['Draft', 'Draft'], ['Completed', 'Completed']], help: 'For theses and reports that are submitted as a draft first.' },
      { name: 'file', label: 'File', type: 'file' },
      { name: 'link', label: 'Or a link', type: 'url', help: 'A SharePoint or Google Drive link instead of an upload.' },
    ],
  },

  presentations: {
    label: 'Presentations',
    singular: 'presentation',
    intro: 'Slides from past presentations, plus placeholders for the ones still to come.',
    titleField: 'title',
    listColumns: [{ field: 'date', label: 'Date', format: 'date' }, { field: 'file', label: 'Slides', format: 'file' }],
    publicPath: () => '/presentations',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 160 },
      { name: 'milestone', label: 'Milestone', type: 'ref', collection: 'milestones' },
      { name: 'date', label: 'Presented on', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { name: 'file', label: 'Slides file', type: 'file', help: 'PDF works best because visitors can open it in the browser.' },
      { name: 'link', label: 'Or a link', type: 'url', help: 'Google Slides, Canva or SharePoint link.' },
      { name: 'video', label: 'Recording', type: 'url', help: 'Optional YouTube link to a recording or demo.' },
      { name: 'thumbnail', label: 'Cover image', type: 'image' },
    ],
  },

  members: {
    label: 'Team & supervisors',
    singular: 'person',
    intro: 'Group members and supervisors shown on the About Us and Contact Us pages.',
    titleField: 'name',
    listColumns: [{ field: 'type', label: 'Type' }, { field: 'studentId', label: 'ID', format: 'mono' }, { field: 'email', label: 'Email' }],
    publicPath: () => '/about',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 120 },
      { name: 'type', label: 'Type', type: 'select', default: 'Team member', options: MEMBER_TYPES.map((t) => [t, t]) },
      { name: 'studentId', label: 'Student or staff ID', type: 'text', maxLength: 40 },
      { name: 'role', label: 'Component or position', type: 'text', maxLength: 160, help: 'For supervisors, e.g. "Senior Lecturer, SLIIT".' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text', maxLength: 40 },
      { name: 'linkedin', label: 'LinkedIn', type: 'url' },
      { name: 'github', label: 'GitHub', type: 'url' },
      { name: 'photo', label: 'Photo', type: 'image', help: 'A square photo works best.' },
      { name: 'bio', label: 'Short description', type: 'textarea', rows: 3 },
      { name: 'achievements', label: 'Achievements', type: 'list', rows: 4 },
    ],
  },

  gallery: {
    label: 'Gallery',
    singular: 'photo',
    intro: 'Photos from field visits, development and events. Shown on Home and About Us.',
    titleField: 'caption',
    listColumns: [{ field: 'image', label: 'Photo', format: 'thumb' }, { field: 'category', label: 'Category' }, { field: 'date', label: 'Date', format: 'date' }],
    publicPath: () => '/about#gallery',
    fields: [
      { name: 'image', label: 'Photo', type: 'image', required: true },
      { name: 'caption', label: 'Caption', type: 'text', maxLength: 200, wide: true },
      { name: 'category', label: 'Category', type: 'select', default: 'Field visits', options: GALLERY_CATEGORIES.map((c) => [c, c]) },
      { name: 'date', label: 'Date', type: 'date' },
    ],
  },
};

const settingsGroups = [
  {
    title: 'Project',
    fields: [
      { name: 'siteTitle', label: 'Project title', type: 'text', required: true, maxLength: 160, wide: true },
      { name: 'shortTitle', label: 'Short name', type: 'text', maxLength: 40, help: 'Shown next to the logo.' },
      { name: 'tagline', label: 'Tagline', type: 'textarea', rows: 2, maxLength: 300 },
      { name: 'groupId', label: 'Group ID', type: 'text', maxLength: 40 },
      { name: 'institution', label: 'Institution', type: 'text' },
      { name: 'faculty', label: 'Faculty', type: 'text' },
      { name: 'degree', label: 'Degree programme', type: 'text' },
      { name: 'year', label: 'Year', type: 'text', maxLength: 20 },
      { name: 'seoDescription', label: 'Search engine description', type: 'textarea', rows: 2, maxLength: 300 },
    ],
  },
  {
    title: 'Home page',
    fields: [
      { name: 'heroReadouts', label: 'Hero readouts', type: 'list', rows: 3, help: '"Label | value | note" per line. Shown on the leaf illustration.' },
      { name: 'problem', label: 'Problem', type: 'textarea', rows: 3 },
      { name: 'effect', label: 'Effect', type: 'textarea', rows: 3 },
      { name: 'solution', label: 'Solution', type: 'textarea', rows: 3 },
      { name: 'stats', label: 'Key figures', type: 'list', rows: 4, help: '"Value | label" per line.' },
      { name: 'stakeholders', label: 'Stakeholders', type: 'list', rows: 4, help: '"Who | how they use it" per line.' },
      { name: 'outcomes', label: 'Outcomes and impact', type: 'list', rows: 6 },
      { name: 'demoVideoUrl', label: 'Demo video (YouTube)', type: 'url' },
    ],
  },
  {
    title: 'Collaboration',
    fields: [
      { name: 'collaboratorName', label: 'Partner', type: 'text', wide: true },
      { name: 'collaboratorText', label: 'About the collaboration', type: 'textarea', rows: 3 },
      { name: 'collaboratorImage', label: 'Photo', type: 'image' },
    ],
  },
  {
    title: 'About Us',
    fields: [
      { name: 'aboutIntro', label: 'Introduction', type: 'markdown', rows: 5 },
      { name: 'achievements', label: 'Project achievements', type: 'list', rows: 4 },
    ],
  },
  {
    title: 'Why betel (home page)',
    fields: [
      { name: 'whyTitle', label: 'Title', type: 'text', maxLength: 120, wide: true },
      { name: 'whyText', label: 'Description', type: 'markdown', rows: 6 },
      { name: 'whyChartA', label: 'Chart 1 bars', type: 'list', rows: 5, help: 'One bar per line: Label | value. Example: Tea | 1507' },
      { name: 'whyChartATitle', label: 'Chart 1 title', type: 'text', wide: true },
      { name: 'whyChartB', label: 'Chart 2 bars', type: 'list', rows: 4, help: 'One bar per line: Label | value' },
      { name: 'whyChartBTitle', label: 'Chart 2 title', type: 'text', wide: true },
      { name: 'whySources', label: 'Sources', type: 'list', rows: 3, help: 'One per line: Source name | https://link' },
    ],
  },
  {
    title: 'Field visit',
    fields: [
      { name: 'fieldVisitTitle', label: 'Title', type: 'text', maxLength: 120, wide: true },
      { name: 'fieldVisitDate', label: 'Date', type: 'date' },
      { name: 'fieldVisitAreas', label: 'Areas', type: 'text', maxLength: 160 },
      { name: 'fieldVisitParticipants', label: 'Participants', type: 'text', maxLength: 160, wide: true, help: 'e.g. 13 participants (10 farmers, 3 local sellers)' },
      { name: 'fieldVisitSummary', label: 'Summary', type: 'textarea', rows: 3 },
      { name: 'fieldVisitResults', label: 'Survey results', type: 'list', rows: 4, help: 'One question per line: Question | number who chose 1, 2, 3, 4, 5. Example: I will keep using this app | 0, 0, 1, 9, 3' },
    ],
  },
  {
    title: 'QA testing (home page)',
    fields: [
      { name: 'qaTotal', label: 'Total test cases', type: 'number', help: 'Leave empty until the QA report is ready; the site then shows "Results will be updated soon".' },
      { name: 'qaPassed', label: 'Passed', type: 'number' },
      { name: 'qaTypes', label: 'Types of testing', type: 'text', wide: true, placeholder: 'Functional, validation, integration, UI' },
      { name: 'qaNote', label: 'Note', type: 'textarea', rows: 2 },
    ],
  },
  {
    title: 'Milestones page',
    fields: [
      { name: 'overallGrade', label: 'Overall grade', type: 'text', maxLength: 60, placeholder: 'To be announced' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { name: 'contactEmail', label: 'Group email', type: 'email' },
      { name: 'contactPhone', label: 'Phone', type: 'text', maxLength: 40 },
      { name: 'address', label: 'Address', type: 'textarea', rows: 2 },
      { name: 'emailTemplateSubject', label: 'Email template subject', type: 'text', wide: true },
      { name: 'emailTemplateBody', label: 'Email template body', type: 'textarea', rows: 8 },
    ],
  },
  {
    title: 'Links and footer',
    fields: [
      { name: 'publicSiteUrl', label: 'Live site address', type: 'url', help: 'e.g. https://betel-ai.onrender.com — used by the course-web export to link large files.' },
      { name: 'githubUrl', label: 'GitHub repository', type: 'url' },
      { name: 'linkedinUrl', label: 'LinkedIn', type: 'url' },
      { name: 'youtubeUrl', label: 'YouTube channel', type: 'url' },
      { name: 'footerNote', label: 'Footer note', type: 'text', wide: true },
    ],
  },
];

const settingsFields = settingsGroups.flatMap((g) => g.fields);

module.exports = { collections, settingsGroups, settingsFields, DOCUMENT_CATEGORIES, GALLERY_CATEGORIES, MEMBER_TYPES };
