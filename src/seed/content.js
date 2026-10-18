'use strict';
// Starter content, taken from the group's Progress Presentation 2 (PP2).
// It is loaded the first time the site starts with an empty store and can
// be edited from the admin panel afterwards. `npm run reset-content` reloads it.
const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '..', '..', 'public');
const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf', svg: 'image/svg+xml' };

// A file that ships with the site (public/media), stored like an upload.
function staticFile(url) {
  const file = path.join(PUBLIC, url);
  const name = path.basename(url);
  const ext = name.split('.').pop().toLowerCase();
  let size = 0;
  try { size = fs.statSync(file).size; } catch { /* missing seed media is not fatal */ }
  return { url, name, mime: MIME[ext] || 'application/octet-stream', size };
}

const shot = (url, caption) => ({ ...staticFile(url), caption });
const orderBy = (ids, items) => ids.map((id) => items.find((x) => x.id === id));

function buildSeed() {
  const now = new Date().toISOString();
  const stamp = (items) => items.map((item, i) => ({ order: (i + 1) * 10, createdAt: now, updatedAt: now, ...item }));

  const ids = {
    thathsara: 'seed-member-thathsara',
    perera: 'seed-member-perera',
    senanayake: 'seed-member-senanayake',
    fernando: 'seed-member-fernando',
    proposal: 'seed-ms-proposal',
    pp1: 'seed-ms-pp1',
    pp2: 'seed-ms-pp2',
    final: 'seed-ms-final',
    taf: 'seed-ms-taf',
    thesis: 'seed-ms-thesis',
  };

  const settings = {
    siteTitle: 'Intelligent Betel Leaf Management System',
    shortTitle: 'Betel AI',
    tagline: 'One mobile app for betel leaf quality grading, disease detection, pest detection and yield prediction, with every model running on the phone.',
    groupId: 'R62-IT-062',
    institution: 'Sri Lanka Institute of Information Technology (SLIIT)',
    faculty: 'Faculty of Computing',
    degree: 'B.Sc. (Hons) in Information Technology',
    year: '2026',
    seoDescription: 'Final-year research project R62-IT-062 at SLIIT: an AI-based Flutter app for betel leaf quality grading, disease detection, pest detection and yield prediction.',
    heroReadouts: [
      'Quality grade | A · 92.6% | EfficientNet-B0',
      'OOD check | 1369.5 / 2131.3 | In-distribution',
      'Yield forecast | 36 leaves/bed | ±1.9 leaves',
    ],
    problem: 'Betel leaf farmers mainly rely on manual inspection and personal experience to assess leaf quality, identify diseases and pests, and estimate yield. This makes the process time-consuming, subjective, and difficult to perform consistently.',
    effect: 'These challenges can lead to inaccurate quality grading, delayed disease and pest identification, crop damage, reduced leaf quality and yield, and difficulty in making informed harvesting and farming decisions.',
    solution: 'Our project develops an AI-based mobile application that integrates quality grading, disease detection, pest detection, and yield prediction, allowing farmers to analyse leaf images and enter field measurements to receive faster and data-driven farming insights.',
    stats: [
      '4 | AI components in one Flutter app',
      '5 | export quality grades, A to E',
      '94.48% | R² of the yield predictor on test data',
      'Offline | ONNX models run on the phone',
    ],
    stakeholders: [
      'Farmers | Data entry, insight access and decision making',
      'Exporters & suppliers | Quality verification, export compliance and product tracking',
      'Agricultural experts | Monitoring, advisories and recommendations',
      'Government & institutions | Policy, support, analytics and oversight',
    ],
    outcomes: [
      'Higher quality export standards',
      'Early disease and pest detection',
      'Optimised irrigation and resource use',
      'Increased yield and profitability',
      'Reduced chemical usage',
      'Data-driven farming decisions',
    ],
    demoVideoUrl: '',
    collaboratorName: 'Intercropping & Betel Research Station (IBRS), Narammala',
    collaboratorText: 'The team visited the Intercropping & Betel Research Station in Narammala, in Sri Lanka\'s betel-growing Kurunegala district, to ground the project in real cultivation practice.',
    collaboratorImage: staticFile('/media/photos/ibrs-visit.webp'),
    aboutIntro: 'We are a group of four final-year **B.Sc. (Hons) in Information Technology** undergraduates at the Sri Lanka Institute of Information Technology (SLIIT). Our research project, **R62-IT-062**, applies computer vision and machine learning to betel cultivation, and each member owns one component of the shared mobile application.',
    achievements: [],
    contactEmail: '',
    overallGrade: 'To be announced',
    qaTotal: '', qaPassed: '', qaTypes: 'Functional, validation, integration and UI testing', qaNote: 'The full QA report is on the Documents page.',
    whyTitle: 'Why we chose betel leaf',
    whyText: 'Betel is a **foreign-exchange crop** grown mostly by smallholder farmers. Its export price depends on leaf quality, yet grading, disease and pest checks are still done by eye.\n\n- Exports to Pakistan, the main market, earned **US$ 13.39 million in 2025**, up from US$ 9.27 million in 2024 but still below US$ 17.77 million in 2019, so there is room to grow.\n- The area under betel cultivation grew **44% to 1,676 hectares** by 2025.\n- Tea, rubber and coconut have research institutes and digital tools; betel farmers have almost none.\n- The same approach can later cover larger spice exports such as **cinnamon and pepper**.',
    whyChartATitle: 'Sri Lanka agricultural export earnings, 2025 (US$ million)',
    whyChartA: ['Tea | 1507', 'Coconut products | 1233', 'Rubber products | 946', 'Spices & essential oils | 450', 'Betel leaves (Pakistan) | 13.4'],
    whyChartBTitle: 'Betel leaf exports to Pakistan (US$ million)',
    whyChartB: ['2019 | 17.77', '2024 | 9.27', '2025 | 13.39'],
    whySources: ['Daily FT – Export earnings up 5.6% to $17.2 b in 2025 | https://www.ft.lk/top-story/Export-earnings-up-5-6-to-17-2-b-in-2025/26-787471', 'NewKerala – Sri Lanka\'s betel exports and Pakistani tariffs (Sep 2026) | https://www.newkerala.com/news/a/sri-lankas-betel-exports-slump-amidst-pakistani-tariffs-992.htm'],
    fieldVisitTitle: 'Field visit and app evaluation',
    fieldVisitDate: '2026-10-09',
    fieldVisitAreas: 'Narammala and Kuliyapitiya',
    fieldVisitParticipants: '13 participants (10 farmers, 3 local sellers)',
    fieldVisitSummary: 'We met betel farmers and local sellers, demonstrated the Betel Management App and collected their feedback with a short survey (1 = strongly disagree, 5 = strongly agree).',
    fieldVisitResults: ['I will keep using this app | 0, 0, 1, 9, 3', 'I would recommend this app to other farmers | 0, 0, 0, 6, 7'],
    contactPhone: '',
    address: 'Sri Lanka Institute of Information Technology (SLIIT)\nNew Kandy Road, Malabe, Sri Lanka',
    emailTemplateSubject: '[R62-IT-062] Enquiry about the Intelligent Betel Leaf Management System',
    emailTemplateBody: 'Dear R62-IT-062 research team,\n\nI am writing about the Intelligent Betel Leaf Management System.\n\nPurpose of my enquiry:\n\nComponent of interest (quality grading / disease detection / pest detection / yield prediction):\n\nMy details\nName:\nOrganisation:\nPhone:\n\nKind regards,\n',
    publicSiteUrl: '',
    githubUrl: '',
    linkedinUrl: '',
    youtubeUrl: '',
    footerNote: 'Final-year research project · Faculty of Computing, SLIIT',
  };

  const members = stamp([
    {
      id: ids.thathsara, name: 'Thathsara Y P G S', type: 'Team member', studentId: 'IT22290892',
      role: 'Quality Grading & Export Verification', email: 'it22290892@my.sliit.lk', phone: '', linkedin: '', github: '',
      photo: staticFile('/media/team/thathsara.webp'),
      bio: 'Builds the EfficientNet-B0 model that sorts betel leaves into five export grades, with out-of-distribution checks for unfamiliar images.',
      achievements: [],
    },
    {
      id: ids.perera, name: 'Perera A L S R', type: 'Team member', studentId: 'IT22207890',
      role: 'Yield Prediction & Micro-Climate Optimization', email: 'it22207890@my.sliit.lk', phone: '', linkedin: '', github: '',
      photo: staticFile('/media/team/perera.webp'),
      bio: 'Forecasts betel leaf yield from farmer-reported field readings and turns them into daily irrigation advice.',
      achievements: [],
    },
    {
      id: ids.senanayake, name: 'Senanayake H R K G', type: 'Team member', studentId: 'IT22639608',
      role: 'Disease Detection & Management Advisory', email: 'it22639608@my.sliit.lk', phone: '', linkedin: '', github: '',
      photo: staticFile('/media/team/senanayake.webp'),
      bio: 'Detects bacterial leaf disease, fungal brown spot and dried leaves offline on the phone, and pairs each result with treatment advice.',
      achievements: [],
    },
    {
      id: ids.fernando, name: 'Fernando M N S', type: 'Team member', studentId: 'IT22165602',
      role: 'Pest Detection & Integrated Pest Management', email: 'it22165602@my.sliit.lk', phone: '', linkedin: '', github: '',
      photo: staticFile('/media/team/fernando.webp'),
      bio: 'Locates green leafhoppers, aphids, beetles and grasshoppers on betel vines with YOLOv8m to support integrated pest management.',
      achievements: [],
    },
  ]);

  const domain = stamp([
    {
      id: 'seed-domain-why-betel', title: 'Why Betel Leaf?', slug: 'why-betel-leaf',
      summary: 'Betel is a foreign-exchange crop grown by smallholders, where the export price depends on leaf quality.',
      body: [
        'Sri Lanka exports betel leaves mainly to Pakistan. These exports earned **US$ 13.39 million in 2025**, up from US$ 9.27 million in 2024 but still below **US$ 17.77 million in 2019**, so there is room to recover and grow. The area under betel cultivation grew **44% to 1,676 hectares** by 2025.',
        'Yet grading, disease and pest checks are still done by eye, and yield is not planned with data. Better, consistent quality protects export earnings and farmer income, which is what this system supports.',
        '| Agricultural export (2025) | Earnings | Change vs 2024 |\n|---|---|---|\n| Tea | US$ 1,507 million | +5.0% |\n| Coconut and coconut products | US$ 1,233 million | +42.7% |\n| Rubber and rubber products | US$ 946 million | −5.6% |\n| Spices and essential oils | US$ 450 million | −2.6% |\n| Betel leaves (to Pakistan) | US$ 13.4 million | +44.4% |',
        'Sources: [Daily FT, export earnings 2025](https://www.ft.lk/top-story/Export-earnings-up-5-6-to-17-2-b-in-2025/26-787471) · [NewKerala, betel exports and Pakistani tariffs (Sep 2026)](https://www.newkerala.com/news/a/sri-lankas-betel-exports-slump-amidst-pakistani-tariffs-992.htm) · [EDB Pakistan market profile](https://www.srilankabusiness.com/exporters/market-profiles/pakistan.html)',
      ].join('\n\n'),
      items: [
        'Earns foreign exchange | Betel is an export crop; Pakistan is the main market.',
        'Quality sets the price | Buyers pay by grade, but grading is manual and subjective. Consistent grading means fewer rejections.',
        'A growing crop | Cultivated area grew 44% to 1,676 ha by 2025, so more farmers need support.',
        'Smallholder farmers | Losses from disease, pests and poor planning hit small farmers hardest; few can afford experts or IoT sensors.',
        'No digital tools yet | Unlike tea or rubber, betel has almost no AI or mobile tools.',
        'Can extend to other crops | The same approach can later cover cinnamon and pepper, part of the US$ 450 million spice export sector.',
      ],
      itemsStyle: 'cards', image: null, imageCaption: '',
    },
    {
      id: 'seed-domain-literature', title: 'Literature Survey', slug: 'literature-survey',
      summary: 'What existing research says about image-based crop diagnosis, pest detection, yield prediction and reliable deployment in the field.',
      body: [
        'Betel (*Piper betle* L.) is grown widely in Sri Lanka, particularly in the Kurunegala district, for local use and export. Leaf quality, disease and pest pressure and yield are still judged mostly by eye, which is the gap this project starts from.',
        '**Image-based plant disease detection.** Deep convolutional neural networks became the standard approach after Mohanty, Hughes and Salathé [1] reported 99.35% accuracy on the PlantVillage dataset. The same study showed accuracy falling sharply on photographs taken in different conditions, a warning that a model trained on clean images can fail silently in the field.',
        '**Efficient models for phones.** EfficientNet [2] scales network depth, width and input resolution together. Its smallest variant, EfficientNet-B0, has about 5.3 million parameters, which makes it practical for transfer learning on modest datasets and for inference on a smartphone.',
        '**Pest detection.** Single-stage detectors from the YOLO family [3], [4] locate and classify objects in one pass, fast enough for real-time use. Benchmarks such as IP102 [5], with more than 75,000 images across 102 pest classes, show that recognising insects in field photographs is still a hard problem.',
        '**Knowing when not to trust a prediction.** A classifier always returns one of its known classes, even for a photo of something else. Hendrycks and Gimpel [6] proposed using softmax confidence as a baseline for detecting out-of-distribution (OOD) inputs, and Lee et al. [7] showed that a Mahalanobis-distance score on a network\'s internal features detects such inputs considerably better.',
        '**Yield prediction.** A systematic review by van Klompenburg, Kassahun and Catal [11] found temperature, rainfall and soil type to be the most used features in machine-learning yield prediction. Recurrent networks such as LSTM [8] model the time order of field readings, while tree ensembles such as Random Forest [9] and XGBoost [10] perform strongly on tabular agronomic data and show which features matter.',
        '### References',
        '1. S. P. Mohanty, D. P. Hughes and M. Salathé, "Using deep learning for image-based plant disease detection," *Frontiers in Plant Science*, vol. 7, 1419, 2016.',
        '2. M. Tan and Q. V. Le, "EfficientNet: Rethinking model scaling for convolutional neural networks," in *Proc. ICML*, 2019.',
        '3. J. Redmon, S. Divvala, R. Girshick and A. Farhadi, "You only look once: Unified, real-time object detection," in *Proc. CVPR*, 2016.',
        '4. G. Jocher, A. Chaurasia and J. Qiu, "Ultralytics YOLOv8," software, 2023.',
        '5. X. Wu, C. Zhan, Y.-K. Lai, M.-M. Cheng and J. Yang, "IP102: A large-scale benchmark dataset for insect pest recognition," in *Proc. CVPR*, 2019.',
        '6. D. Hendrycks and K. Gimpel, "A baseline for detecting misclassified and out-of-distribution examples in neural networks," in *Proc. ICLR*, 2017.',
        '7. K. Lee, K. Lee, H. Lee and J. Shin, "A simple unified framework for detecting out-of-distribution samples and adversarial attacks," in *Proc. NeurIPS*, 2018.',
        '8. S. Hochreiter and J. Schmidhuber, "Long short-term memory," *Neural Computation*, vol. 9, no. 8, pp. 1735–1780, 1997.',
        '9. L. Breiman, "Random forests," *Machine Learning*, vol. 45, pp. 5–32, 2001.',
        '10. T. Chen and C. Guestrin, "XGBoost: A scalable tree boosting system," in *Proc. ACM SIGKDD*, 2016.',
        '11. T. van Klompenburg, A. Kassahun and C. Catal, "Crop yield prediction using machine learning: A systematic literature review," *Computers and Electronics in Agriculture*, vol. 177, 105709, 2020.',
      ].join('\n\n'),
      items: [], itemsStyle: 'cards', image: null, imageCaption: '',
    },
    {
      id: 'seed-domain-gap', title: 'Research Gap', slug: 'research-gap',
      summary: 'Where current tools fall short for betel farmers, packing houses and exporters.',
      body: 'Each of the four components addresses a specific shortcoming. Together they close a larger one: there is no single, offline tool that covers the main decisions in betel cultivation and export.',
      items: [
        'No integrated platform | Quality grading, disease screening, pest identification and yield forecasting are handled separately, by eye or with separate tools.',
        'Predictions without a reliability check | Classifiers answer even for images they were never trained on, such as a non-leaf photo. Field tools rarely flag these out-of-distribution inputs.',
        'Manual export grading | Pre-export grading in packing houses is subjective. There is no automated five-grade (A–E) assessment built for that workflow.',
        'Costly sensing | Yield and micro-climate tools usually assume fixed IoT sensor networks that smallholder farmers cannot afford.',
        'Unreliable connectivity | Betel gardens often have weak mobile data, so tools that need a server connection are impractical in the field.',
      ],
      itemsStyle: 'cards', image: null, imageCaption: '',
    },
    {
      id: 'seed-domain-problem', title: 'Research Problem', slug: 'research-problem',
      summary: 'Manual inspection makes betel cultivation decisions slow, subjective and inconsistent.',
      body: [
        'Betel leaf farmers mainly rely on manual inspection and personal experience to assess leaf quality, identify diseases and pests, and estimate yield. This makes the process time-consuming, subjective, and difficult to perform consistently.',
        'The consequences are inaccurate quality grading, delayed disease and pest identification, crop damage, reduced leaf quality and yield, and difficulty in making informed harvesting and farming decisions.',
        '> **Research question:** How can deep learning models running offline on a smartphone grade betel leaf quality, detect diseases and pests, and forecast yield from farmer-reported data reliably enough to support real decisions, while recognising inputs they were not trained on?',
      ].join('\n\n'),
      items: [], itemsStyle: 'cards', image: null, imageCaption: '',
    },
    {
      id: 'seed-domain-objectives', title: 'Research Objectives', slug: 'research-objectives',
      summary: 'One main objective, delivered through four specific objectives — one per component.',
      body: '**Main objective:** to develop an AI-based mobile application that helps betel farmers, packing houses and exporters make faster, data-driven decisions about leaf quality, plant health and yield.',
      items: [
        'Quality grading & export verification | Classify betel leaves into five quality grades (A–E) with a fine-tuned EfficientNet-B0 model and flag unfamiliar inputs with Mahalanobis-distance OOD detection, for pre-export checks by packing-house operators.',
        'Yield prediction & micro-climate optimisation | Forecast yield 30–60 days ahead from farmer-reported temperature, humidity, soil moisture, pH and NPK readings, and recommend daily irrigation.',
        'Disease detection & management advisory | Identify bacterial leaf disease, fungal brown spot and dried leaves against healthy leaves, offline on the phone, and give management advice for each result.',
        'Pest detection & integrated pest management | Detect and localise green leafhoppers, aphids, beetles and grasshoppers on betel vines with YOLOv8m to support integrated pest management.',
      ],
      itemsStyle: 'steps', image: null, imageCaption: '',
    },
    {
      id: 'seed-domain-methodology', title: 'Methodology', slug: 'methodology',
      summary: 'An end-to-end pipeline from data collection to decisions delivered in a Flutter app.',
      body: 'Every component follows the same shape: capture data in the app, run a trained model, check how much the result can be trusted, and turn it into advice. Image models are trained with transfer learning, verified with a Mahalanobis-distance out-of-distribution check, and exported to ONNX so they run on the phone without a server connection.',
      items: [
        'Data collection | Leaf and pest images, farmer-entered readings (temperature, humidity, soil moisture, pH, NPK) with geotags and timestamps, and external weather and rainfall data.',
        'AI processing | EfficientNet-B0 for quality grading and disease detection, YOLOv8m for pest detection, and LSTM with Random Forest and XGBoost for yield prediction.',
        'Decision & advisory | Quality grade and export acceptability, disease type with treatment suggestion, pest type with integrated management, and an irrigation plan with a 30–60 day yield forecast.',
        'Delivery & access | A Flutter mobile application with on-device ONNX inference, used by farmers, exporters and agricultural experts.',
        'Outcomes & impact | Higher export quality, early disease and pest detection, optimised irrigation, higher yield and profit, and less chemical use.',
      ],
      itemsStyle: 'steps',
      image: staticFile('/media/workflows/full-system.webp'),
      imageCaption: 'Full system workflow: stakeholders, data collection, AI models, decisions, delivery and outcomes.',
    },
    {
      id: 'seed-domain-technologies', title: 'Technologies Used', slug: 'technologies-used',
      summary: 'The models, frameworks and services behind the system.',
      body: '',
      items: [
        'Flutter | Cross-platform mobile application',
        'ONNX Runtime | Offline, on-device model inference',
        'EfficientNet-B0 | Quality grading and disease classification',
        'YOLOv8m | Real-time pest detection and localisation',
        'LSTM | Yield forecasting from 14-day sequences',
        'Random Forest & XGBoost | Environmental feature analysis',
        'Mahalanobis OOD detection | Flags unfamiliar or non-leaf inputs',
        'FastAPI | Backend API for field readings',
        'PostgreSQL | Validated, timestamped, geotagged data',
        'SQLite | Local cache on the phone',
        'Firebase | Realtime database',
        'Python | Model training and data processing',
        'Weather API | Rainfall forecasts for irrigation advice',
      ],
      itemsStyle: 'chips', image: null, imageCaption: '',
    },
    {
      id: 'seed-domain-business', title: 'Commercialisation & Ethics', slug: 'commercialisation-and-ethics',
      summary: 'Who the system is for, how it can be sustained, and how it handles data and decisions responsibly.',
      body: [
        '**Target audience:** betel farmers, packing houses, exporters and agricultural organisations.',
        '**Value proposition:** one AI-powered platform for quality grading, disease detection, pest management, yield prediction and micro-climate optimisation.',
        '**Business model:** subscription or licensing for farmers, farming organisations, packing houses and exporters.',
      ].join('\n\n'),
      items: [
        'Data privacy | Secure handling of farmer, farm and crop data.',
        'AI reliability | The AI supports decisions; important decisions allow human verification.',
        'Responsible agriculture | Promotes safe and sustainable farming and pest-management practices.',
      ],
      itemsStyle: 'cards', image: null, imageCaption: '',
    },
  ]);

  const onnxNote = 'The final model is exported to ONNX and integrated into the Flutter application for on-device inference without requiring a server connection.';

  const components = stamp(orderBy(['seed-comp-quality', 'seed-comp-yield', 'seed-comp-disease', 'seed-comp-pest'], [
    {
      id: 'seed-comp-quality', title: 'Quality Grading & Export Verification', slug: 'quality-grading', shortTitle: 'Quality Grading',
      member: ids.thathsara, illustration: 'grading', accent: 'leaf',
      tagline: 'Grades betel leaves from A to E with a fine-tuned EfficientNet-B0 and flags unfamiliar images before they reach an export decision.',
      overview: [
        'Addresses the problem of manual and subjective betel leaf quality grading before export.',
        'Classifies betel leaves into five quality grades (A–E) based on visual quality.',
        'Uses a fine-tuned EfficientNet-B0 deep learning model for image classification.',
        'Uses Mahalanobis-distance out-of-distribution (OOD) detection to identify unfamiliar inputs.',
        'Provides grade prediction, confidence score and OOD status through a Flutter mobile application.',
        'Designed for practical use by packing-house operators during pre-export quality verification.',
      ],
      novelty: 'Combines AI-based five-grade betel leaf classification with OOD detection and mobile deployment for reliable export quality verification.',
      models: ['EfficientNet-B0', 'Mahalanobis OOD', 'ONNX Runtime', 'Flutter'],
      workflow: [
        'Leaf image capture | Photo taken in the Flutter mobile app',
        'Image preprocessing | Prepare the captured image for inference',
        'EfficientNet-B0 | Extract visual features',
        'Quality classification | Grade A, B, C, D or E',
        'Confidence analysis | Prediction with a confidence score',
        'OOD verification | Mahalanobis distance against the training classes',
        'Final output | Grade, confidence and OOD status; unfamiliar inputs flagged for human review',
      ],
      workflowNote: onnxNote,
      workflowImage: staticFile('/media/workflows/quality-grading.webp'),
      pp1Feedback: ['Model training only.', 'No GUI implementation.', 'The complete system was expected to reach 90% completion by the PP2 milestone.'],
      pp2Improvements: [
        'Completed the Flutter mobile application.',
        'Integrated the trained EfficientNet-B0 model into the application.',
        'Implemented Grade A–E quality classification.',
        'Added confidence score and OOD verification.',
        'Completed the end-to-end workflow from image capture to quality verification.',
        'System now supports on-device inference for practical use.',
      ],
      progressNote: 'PP1: AI model only → PP2: complete end-to-end mobile system',
      results: [
        'The completed system demonstrates accurate five-grade betel leaf classification with OOD-based verification and practical on-device deployment through the Flutter mobile application.',
        'Each result screen shows the predicted grade, the model\'s confidence, the class probabilities and the OOD score against the threshold of 2131.3, followed by a recommendation for that grade:',
        '| Grade | Guidance shown in the app |\n|---|---|\n| B | Good quality. Minor surface marks acceptable. Suitable for standard commercial trade. |\n| C | Average quality. Some yellowing or light damage. Suitable for local markets at a reduced price. |\n| D | Below average. Notable discolouration or disease spots. Limited commercial value; consider early harvest next cycle. |\n| E | Poor quality. Significant damage, wilting or disease. Not suitable for trade; review cultivation practices. |',
      ].join('\n\n'),
      metrics: ['Grade A sample | 92.6%', 'Grade B sample | 91.1%', 'Grade C sample | 96.2%', 'Grade D sample | 90.8%', 'Grade E sample | 93.3%'],
      screenshots: [
        shot('/media/screens/quality-grade-a.webp', 'Grade A — 92.6% confidence, in-distribution (OOD score 1369.5)'),
        shot('/media/screens/quality-grade-b.webp', 'Grade B — 91.1% confidence'),
        shot('/media/screens/quality-grade-c.webp', 'Grade C — 96.2% confidence'),
        shot('/media/screens/quality-grade-d.webp', 'Grade D — 90.8% confidence'),
        shot('/media/screens/quality-grade-e.webp', 'Grade E — 93.3% confidence'),
      ],
    },
    {
      id: 'seed-comp-disease', title: 'Disease Detection & Management Advisory', slug: 'disease-detection', shortTitle: 'Disease Detection',
      member: ids.senanayake, illustration: 'disease', accent: 'rust',
      tagline: 'Identifies bacterial leaf disease, fungal brown spot and dried leaves offline on the phone, and pairs each result with management advice.',
      overview: [
        'Detects betel leaf diseases using AI-based image classification.',
        'Uses EfficientNet-B0 with transfer learning.',
        'Classifies leaves into four conditions: bacterial leaf disease, fungal brown spot disease, dried leaf and healthy leaf.',
        'Uses OOD detection to reject unreliable or non-leaf inputs.',
        'Designed for offline mobile disease screening.',
      ],
      novelty: 'Combines AI-based betel leaf disease detection with OOD verification and offline mobile deployment for reliable field-level disease screening.',
      models: ['EfficientNet-B0', 'Transfer learning', 'Mahalanobis OOD', 'ONNX Runtime'],
      workflow: [
        'Leaf image capture | Photo taken in the mobile application',
        'Image preprocessing | Resize to 224 × 224 and normalise',
        'EfficientNet-B0 | Extract leaf features (1280-dimensional feature vector)',
        'Disease classification | Bacterial leaf disease, fungal brown spot, dried leaf or healthy leaf',
        'Confidence analysis | Prediction with a confidence score',
        'OOD verification | Mahalanobis distance',
        'Final output | Disease result, confidence score and OOD status',
      ],
      workflowNote: 'Both the classifier and the feature extractor are exported to ONNX, so screening works offline in the field.',
      workflowImage: staticFile('/media/workflows/disease-detection.webp'),
      pp1Feedback: ['Component was functionally working.', 'The panel asked for a clearer explanation of the code and implementation.', 'System was expected to reach 90% completion by PP2.'],
      pp2Improvements: [
        'Improved understanding and explanation of the complete AI pipeline.',
        'Completed two-phase EfficientNet-B0 training and fine-tuning.',
        'Implemented 4-class disease classification.',
        'Added Mahalanobis OOD detection.',
        'Exported the classifier and feature extractor to ONNX.',
        'Prepared the model for offline mobile deployment.',
      ],
      progressNote: 'Working model → PP2: complete, explainable and deployment-ready AI pipeline',
      results: [
        'The EfficientNet-B0 model achieved high and balanced performance across all four betel leaf conditions, with OOD detection providing an additional reliability layer for invalid inputs.',
        'The app explains every result and suggests what to do next:',
        '| Condition | Advice shown in the app |\n|---|---|\n| Healthy leaf | No disease detected. Good colour and texture; continue regular care and monitoring. |\n| Fungal brown spot | Brown circular spots with yellow halos. Apply fungicide and improve air circulation. |\n| Bacterial leaf disease | Water-soaked lesions, yellowing and wilting. Treat with copper-based bactericides and remove infected leaves. |\n| Dried leaf | Desiccation from water stress, nutrient deficiency or environmental conditions. Improve irrigation and check soil moisture. |',
      ].join('\n\n'),
      metrics: ['Healthy leaf sample | 92.1%', 'Fungal brown spot sample | 92.4%', 'Bacterial leaf disease sample | 95.0%', 'Dried leaf sample | 95.2%'],
      screenshots: [
        shot('/media/screens/disease-healthy.webp', 'Healthy leaf — 92.1% confidence'),
        shot('/media/screens/disease-fungal.webp', 'Fungal brown spot disease — 92.4% confidence'),
        shot('/media/screens/disease-bacterial.webp', 'Bacterial leaf disease — 95.0% confidence'),
        shot('/media/screens/disease-dried.webp', 'Dried leaf — 95.2% confidence'),
      ],
    },
    {
      id: 'seed-comp-pest', title: 'Pest Detection & Integrated Pest Management', slug: 'pest-detection', shortTitle: 'Pest Detection',
      member: ids.fernando, illustration: 'pest', accent: 'teal',
      tagline: 'Finds and boxes four betel vine pests in a single photo with YOLOv8m, and checks that the image resembles the training data.',
      overview: [
        'Addresses the difficulty of manual pest identification in betel cultivation.',
        'Detects and localises pests directly from betel vine images.',
        'Uses YOLOv8m for real-time object detection.',
        'Identifies four pest classes: green leafhopper, aphid, beetle and grasshopper.',
        'Uses Mahalanobis OOD detection to flag unfamiliar inputs.',
        'Supports an offline-capable deployment pipeline through ONNX.',
      ],
      novelty: 'Combines multi-class betel pest localisation with OOD detection for reliable AI-assisted pest identification.',
      models: ['YOLOv8m', 'Mahalanobis OOD', 'ONNX Runtime'],
      workflow: [
        'Image capture | Photo of a betel vine or leaf',
        'Image preprocessing | Resize to 640 × 640',
        'YOLOv8m detection | Extract features and detect objects',
        'Pest classification | Leafhopper, aphid, beetle or grasshopper',
        'Pest localisation | Bounding box with a confidence score',
        'OOD verification | Mahalanobis distance: in-distribution or out-of-distribution',
        'Final output | Pest type, location, confidence and OOD status',
      ],
      workflowNote: 'The complete detection pipeline is exported to ONNX for offline use.',
      workflowImage: staticFile('/media/workflows/pest-detection.webp'),
      pp1Feedback: ['Component was functionally working.', 'The panel asked for a clearer explanation of the code.', 'System was expected to reach 90% completion by PP2.'],
      pp2Improvements: [
        'Improved understanding of the complete model architecture and code flow.',
        'Finalised the YOLOv8m pest detection model.',
        'Implemented detection for four pest classes.',
        'Added pest localisation using bounding boxes.',
        'Exported the complete detection pipeline to ONNX.',
        'Prepared the component for integration with the broader integrated pest management system.',
      ],
      progressNote: '',
      results: 'The YOLOv8m model achieved high pest-detection performance across four betel pest classes, while OOD verification provides an additional reliability layer for unfamiliar field inputs.',
      metrics: ['Green leafhopper sample | 76.5%', 'Aphid sample | 84.4%', 'Grasshopper sample | 75.6%', 'Beetle sample | 76.0%'],
      screenshots: [
        shot('/media/screens/pest-leafhopper.webp', 'Green leafhopper — 76.5% confidence, in-distribution'),
        shot('/media/screens/pest-aphid.webp', 'Aphid — 84.4% confidence, in-distribution'),
        shot('/media/screens/pest-beetle.webp', 'Beetle — 76.0% confidence, in-distribution'),
      ],
    },
    {
      id: 'seed-comp-yield', title: 'Yield Prediction & Micro-Climate Optimization', slug: 'yield-prediction', shortTitle: 'Yield Prediction',
      member: ids.perera, illustration: 'yield', accent: 'gold',
      tagline: 'Forecasts leaf yield 30–60 days ahead from readings farmers enter themselves, and turns them into a daily watering plan without fixed IoT sensors.',
      overview: [
        'Addresses the lack of data-driven yield forecasting and micro-climate management in betel cultivation.',
        'Uses farmer-reported environmental data instead of expensive fixed IoT sensor networks.',
        'Collects temperature, humidity, soil moisture, pH and NPK readings through a Flutter mobile application.',
        'Uses LSTM for betel leaf yield forecasting.',
        'Uses Random Forest and XGBoost for environmental feature analysis and cross-validation.',
        'Provides irrigation recommendations based on soil moisture, temperature and rainfall forecasts.',
        'Designed as a low-cost and accessible solution for smallholder betel farmers.',
      ],
      novelty: 'Combines farmer-reported environmental data with AI-based yield prediction and micro-climate optimisation, eliminating the need for costly fixed IoT infrastructure.',
      models: ['LSTM', 'Random Forest', 'XGBoost', 'FastAPI', 'PostgreSQL', 'ONNX Runtime'],
      workflow: [
        'Environmental data entry | Temperature, humidity, soil moisture, pH and NPK in the Flutter app',
        'Data validation & storage | Validate, timestamp and geotag each reading',
        'Backend processing | FastAPI with PostgreSQL',
        'LSTM yield prediction | 14-day input sequence to a 30–60 day yield forecast',
        'Feature analysis | Random Forest and XGBoost identify the key environmental factors',
        'Micro-climate optimisation | Soil moisture, temperature and rainfall forecast give a daily watering recommendation',
        'Farmer dashboard | Forecast, insights and recommendations',
      ],
      workflowNote: onnxNote,
      workflowImage: staticFile('/media/workflows/yield-prediction.webp'),
      pp1Feedback: ['Round up the yield prediction result for clearer presentation.', 'Add a confidence score to the yield prediction.', 'System should reach 90% completion by PP2.'],
      pp2Improvements: [
        'Updated yield predictions to provide clear rounded results.',
        'Added confidence information to improve prediction reliability.',
        'Developed the Flutter-based farmer interface.',
        'Implemented environmental data collection and validation.',
        'Integrated the LSTM yield prediction pipeline.',
        'Added Random Forest and XGBoost for environmental feature analysis.',
        'Developed the micro-climate and irrigation advisory module.',
        'Integrated the major components into the end-to-end system.',
      ],
      progressNote: '',
      results: [
        'The leaf-count predictor in the app (XGBoost on ONNX Runtime, 25 engineered features) reports an R² of 94.48% on test data, with a mean absolute error of about ±1.9 leaves per bed.',
        'For the sample reading shown (soil moisture 60%, pH 6.0, rainfall 100 mm, humidity 70%, temperature 29 °C, and N, P and K of 135, 45 and 100 kg/ha) it predicts **36 leaves per bed**, inside the "Average" 35–39 band. The result screen also flags which inputs sit in their optimal range and how much each feature pushed the prediction up or down.',
      ].join('\n\n'),
      metrics: ['R² on test data | 94.48%', 'Mean absolute error | ±1.88 leaves', 'Engineered features | 25', 'Sample forecast | 36 leaves/bed'],
      screenshots: [
        shot('/media/screens/yield-inputs.webp', 'Soil and weather inputs'),
        shot('/media/screens/yield-inputs-npk.webp', 'Temperature and NPK fertiliser inputs'),
        shot('/media/screens/yield-result.webp', 'Prediction: 36 leaves per bed, Average band (35–39)'),
        shot('/media/screens/yield-flags.webp', 'Optimal-range flags and feature contributions'),
        shot('/media/screens/yield-features.webp', 'Input summary and engineered feature vector'),
      ],
    },
  ]));

  const milestones = stamp([
    {
      id: ids.taf, title: 'TAF Submission', slug: 'taf-submission', date: '2026-01-01', dateText: 'January 2026', weight: '', status: 'completed',
      summary: 'Topic Assessment Form submitted to register the research topic, the group and the supervisors.',
      details: '', deliverables: ['TAF document'],
    },
    {
      id: ids.proposal, title: 'Proposal Presentation', slug: 'proposal-presentation', date: '2026-03-16', weight: '12%', status: 'completed',
      summary: 'Proposal presentation and documents introducing the research problem, objectives, methodology and the four components.',
      details: '', deliverables: ['Project proposal presentation', 'Project proposal document (each member)'],
    },
    {
      id: ids.pp1, title: 'Progress Presentation 1', slug: 'progress-presentation-1', date: '2026-05-11', weight: '15%', status: 'completed',
      summary: 'First progress review of each component\'s models and early implementation.',
      details: 'The panel set the target of reaching **90% system completion by PP2**. Component-level feedback and how it was addressed is listed on each research component page.',
      deliverables: ['Progress Presentation 1 slides', 'Checklist 1'],
    },
    {
      id: ids.pp2, title: 'Progress Presentation 2', slug: 'progress-presentation-2', date: '2026-09-01', weight: '18%', status: 'completed',
      summary: 'All four components shown as working Flutter app features with on-device ONNX inference and OOD verification.',
      details: 'Each member presented the PP1 feedback for their component, the improvements made since, the end-to-end workflow and results from the mobile app. The group also covered business potential, commercialisation and ethical considerations.',
      deliverables: ['Progress Presentation 2 slides', 'Demo Video 1', 'Research paper (each member)'],
    },
    {
      id: ids.final, title: 'Final Assessment', slug: 'final-assessment', date: '2026-10-19', weight: '20%', status: 'upcoming',
      summary: 'Final presentation, viva and demonstration of the complete, integrated system.',
      details: '', deliverables: ['Final viva presentation', 'Checklist 2', 'Project website'],
    },
    {
      id: ids.thesis, title: 'Final Thesis Submission', slug: 'final-thesis-submission', date: '2026-10-28', weight: '19%', status: 'upcoming',
      summary: 'Submission of the individual theses and the group thesis.',
      details: '', deliverables: ['Project thesis (individual)', 'Project thesis (group)'],
    },
  ]);

  const people = [['Thathsara Y P G S', 'thathsara'], ['Perera A L S R', 'perera'], ['Senanayake H R K G', 'senanayake'], ['Fernando M N S', 'fernando']];
  const doc = (id, title, category, extra = {}) => ({ id, title, category, description: '', author: 'Group', date: '', version: '', file: null, link: '', ...extra });
  const each = (key, title, category, extra = {}) => people.map(([name, slug]) => doc(`seed-doc-${key}-${slug}`, `${title} — ${name}`, category, { author: name, ...extra }));
  const documents = stamp([
    doc('seed-doc-taf', 'TAF Document', 'TAF', { description: 'Topic Assessment Form.', date: '' }),
    ...each('proposal', 'Project Proposal Document', 'Proposal Documents', { description: 'Individual project proposal.' }),
    doc('seed-doc-checklist-1', 'Checklist 1', 'Checklist Documents', { date: '2026-05-13' }),
    doc('seed-doc-proposal-pres', 'Project Proposal Presentation', 'Presentations', { date: '2026-03-16' }),
    doc('seed-doc-pp1', 'Progress Presentation 1', 'Presentations', { date: '2026-05-11' }),
    ...each('paper', 'Research Paper', 'Research Papers'),
    doc('seed-doc-pp2', 'Progress Presentation 2', 'Presentations', { date: '2026-09-01', file: staticFile('/media/slides/R62-IT-062-PP2.pdf') }),
    doc('seed-doc-demo-1', 'Demo Video 1', 'Demo Videos', { date: '2026-08-31', description: 'Demonstration of the mobile app.' }),
    doc('seed-doc-qa-report', 'QA Test Report', 'Testing', { description: 'Test cases and results for all four components and the app. Results will be updated.' }),
    doc('seed-doc-checklist-2', 'Checklist 2', 'Checklist Documents', { date: '2026-10-14' }),
    ...each('thesis', 'Project Thesis (Individual)', 'Thesis', { version: 'Draft' }),
    doc('seed-doc-thesis-group', 'Project Thesis (Group)', 'Thesis', { version: 'Draft' }),
    doc('seed-doc-final-viva', 'Final Viva Presentation', 'Presentations', { date: '2026-10-19' }),
  ]);

  const presentations = stamp([
    { id: 'seed-pres-proposal', title: 'Proposal Presentation', milestone: ids.proposal, date: '2026-03-16', description: 'Problem, objectives, methodology and the four components.', file: null, link: '', video: '', thumbnail: null },
    { id: 'seed-pres-pp1', title: 'Progress Presentation 1', milestone: ids.pp1, date: '2026-05-11', description: 'Models and early implementation for each component.', file: null, link: '', video: '', thumbnail: null },
    {
      id: 'seed-pres-pp2', title: 'Progress Presentation 2', milestone: ids.pp2, date: '2026-09-01',
      description: 'Working Flutter app with all four components, PP1 feedback and improvements, results, business potential and ethics.',
      file: staticFile('/media/slides/R62-IT-062-PP2.pdf'), link: '', video: '', thumbnail: staticFile('/media/slides/pp2-cover.webp'),
    },
    { id: 'seed-pres-final', title: 'Final Viva Presentation', milestone: ids.final, date: '2026-10-19', description: 'Final demonstration of the complete, integrated system.', file: null, link: '', video: '', thumbnail: null },
  ]);

  const gallery = stamp([
    { id: 'seed-gal-ibrs', image: staticFile('/media/photos/ibrs-visit.webp'), caption: 'Field visit to the Intercropping & Betel Research Station (IBRS), Narammala', category: 'Field visits', date: '' },
    { id: 'seed-gal-grading', image: staticFile('/media/screens/quality-grade-a.webp'), caption: 'Quality grading: Grade A result with OOD check', category: 'Development', date: '' },
    { id: 'seed-gal-disease', image: staticFile('/media/screens/disease-bacterial.webp'), caption: 'Disease detection: bacterial leaf disease identified', category: 'Development', date: '' },
    { id: 'seed-gal-pest', image: staticFile('/media/screens/pest-aphid.webp'), caption: 'Pest detection: aphid located with YOLOv8m', category: 'Development', date: '' },
    { id: 'seed-gal-yield', image: staticFile('/media/screens/yield-result.webp'), caption: 'Yield prediction: 36 leaves per bed', category: 'Development', date: '' },
    { id: 'seed-gal-pp2', image: staticFile('/media/slides/pp2-cover.webp'), caption: 'Progress Presentation 2 title slide', category: 'Presentations', date: '2026-09-01' },
  ]);

  return {
    settings,
    collections: { domain, components, milestones, documents, presentations, members, gallery, messages: [] },
  };
}

module.exports = { buildSeed, staticFile };
