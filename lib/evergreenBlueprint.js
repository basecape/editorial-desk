// Editorial blueprint for full topical authority on an SA health publication.
// 50 evergreen topics per category × 5 categories = 250 total.
// Each topic has: title, keyword, cluster, category.
// Clicked "Load blueprint" populates these into the topics queue as pending evergreen topics.

export const EVERGREEN_BLUEPRINT = [
  // === FITNESS (50) ===
  // Getting started
  { category: 'fitness', cluster: 'Getting started', title: "How to start exercising when you've been inactive for years", keyword: 'beginner exercise' },
  { category: 'fitness', cluster: 'Getting started', title: 'The 30-day fitness habit guide that actually sticks', keyword: 'fitness habit' },
  { category: 'fitness', cluster: 'Getting started', title: 'How many steps a day do you actually need?', keyword: 'daily steps health' },
  { category: 'fitness', cluster: 'Getting started', title: 'What to eat before and after a workout', keyword: 'pre workout nutrition' },
  { category: 'fitness', cluster: 'Getting started', title: 'Why your first month of exercise feels terrible (and how to push through)', keyword: 'starting exercise' },
  // Cardio
  { category: 'fitness', cluster: 'Cardio', title: 'The truth about cardio for fat loss', keyword: 'cardio fat loss' },
  { category: 'fitness', cluster: 'Cardio', title: 'Walking vs running for health: which is better', keyword: 'walking vs running' },
  { category: 'fitness', cluster: 'Cardio', title: 'How to build cardio fitness from zero', keyword: 'build cardiovascular fitness' },
  { category: 'fitness', cluster: 'Cardio', title: 'Low-impact cardio for beginners and seniors', keyword: 'low impact cardio' },
  { category: 'fitness', cluster: 'Cardio', title: "HIIT explained: who it's for and who should avoid it", keyword: 'HIIT training' },
  // Strength
  { category: 'fitness', cluster: 'Strength training', title: 'Why women need to lift heavy weights', keyword: 'strength training women' },
  { category: 'fitness', cluster: 'Strength training', title: "Bodyweight strength training: a complete beginner's plan", keyword: 'bodyweight workout plan' },
  { category: 'fitness', cluster: 'Strength training', title: 'How to build muscle after 40', keyword: 'muscle building age 40' },
  { category: 'fitness', cluster: 'Strength training', title: 'The big four lifts every beginner should learn', keyword: 'squat deadlift bench overhead' },
  { category: 'fitness', cluster: 'Strength training', title: 'Strength training mistakes that stall your progress', keyword: 'strength training plateau' },
  { category: 'fitness', cluster: 'Strength training', title: 'How much protein you really need to build muscle', keyword: 'protein for muscle' },
  // Home workouts
  { category: 'fitness', cluster: 'Home workouts', title: 'Building a home gym on a budget in South Africa', keyword: 'home gym SA' },
  { category: 'fitness', cluster: 'Home workouts', title: 'Effective workouts using only your bodyweight', keyword: 'bodyweight workouts' },
  { category: 'fitness', cluster: 'Home workouts', title: '20-minute home workouts that actually work', keyword: 'short home workouts' },
  { category: 'fitness', cluster: 'Home workouts', title: 'Resistance band workouts for full-body strength', keyword: 'resistance band training' },
  { category: 'fitness', cluster: 'Home workouts', title: 'How to stay motivated working out alone at home', keyword: 'home workout motivation' },
  // Running
  { category: 'fitness', cluster: 'Running', title: 'Couch to 5K: a realistic plan for South Africans', keyword: 'couch to 5K SA' },
  { category: 'fitness', cluster: 'Running', title: 'How to choose running shoes that fit your gait', keyword: 'running shoes guide' },
  { category: 'fitness', cluster: 'Running', title: 'Common running injuries and how to prevent them', keyword: 'running injury prevention' },
  { category: 'fitness', cluster: 'Running', title: 'Training for your first Comrades or Two Oceans', keyword: 'long distance race training' },
  { category: 'fitness', cluster: 'Running', title: 'Running in the heat: tips for SA summers', keyword: 'running summer heat' },
  // Recovery
  { category: 'fitness', cluster: 'Recovery & injury', title: 'Active recovery vs rest days: what your body actually needs', keyword: 'active recovery' },
  { category: 'fitness', cluster: 'Recovery & injury', title: "How to prevent and treat runner's knee", keyword: 'runners knee' },
  { category: 'fitness', cluster: 'Recovery & injury', title: 'Foam rolling 101: does it actually help?', keyword: 'foam rolling benefits' },
  { category: 'fitness', cluster: 'Recovery & injury', title: 'When muscle soreness means something more serious', keyword: 'DOMS vs injury' },
  { category: 'fitness', cluster: 'Recovery & injury', title: "Sleep's role in muscle recovery and performance", keyword: 'sleep recovery athletes' },
  // Sports
  { category: 'fitness', cluster: 'Sports performance', title: 'How rugby and soccer players train in the off-season', keyword: 'sport offseason training' },
  { category: 'fitness', cluster: 'Sports performance', title: 'CrossFit explained: benefits, risks, and is it for you', keyword: 'crossfit guide' },
  { category: 'fitness', cluster: 'Sports performance', title: "Boxing for fitness: a beginner's introduction", keyword: 'boxing fitness beginner' },
  { category: 'fitness', cluster: 'Sports performance', title: 'How to train like a sprinter for everyday fitness', keyword: 'sprinter training' },
  // Women's fitness
  { category: 'fitness', cluster: 'Women & fitness', title: 'How exercise affects your menstrual cycle', keyword: 'exercise menstrual cycle' },
  { category: 'fitness', cluster: 'Women & fitness', title: 'Safe and effective workouts during pregnancy', keyword: 'pregnancy exercise' },
  { category: 'fitness', cluster: 'Women & fitness', title: 'Postpartum fitness: returning to exercise after birth', keyword: 'postpartum exercise' },
  { category: 'fitness', cluster: 'Women & fitness', title: 'Menopause and fitness: what changes and what to do', keyword: 'menopause fitness' },
  { category: 'fitness', cluster: 'Women & fitness', title: 'Pelvic floor exercises every woman should do', keyword: 'pelvic floor exercises' },
  // Older adults
  { category: 'fitness', cluster: 'Older adults', title: 'The best exercises for adults over 60', keyword: 'exercise over 60' },
  { category: 'fitness', cluster: 'Older adults', title: 'How to prevent falls with balance training', keyword: 'balance training elderly' },
  { category: 'fitness', cluster: 'Older adults', title: 'Exercising with arthritis: what works', keyword: 'arthritis exercise' },
  { category: 'fitness', cluster: 'Older adults', title: 'Staying mobile and independent into your 70s and beyond', keyword: 'senior mobility' },
  { category: 'fitness', cluster: 'Older adults', title: 'Strength training for bone density after 50', keyword: 'bone density exercise' },
  // Mental side
  { category: 'fitness', cluster: 'The mental side', title: 'How regular exercise treats depression and anxiety', keyword: 'exercise mental health' },
  { category: 'fitness', cluster: 'The mental side', title: "The science of the runner's high", keyword: 'exercise endorphins' },
  { category: 'fitness', cluster: 'The mental side', title: '"No pain no gain" is wrong: why it hurts your results', keyword: 'exercise mindset' },
  { category: 'fitness', cluster: 'The mental side', title: 'Building consistency: why you keep quitting and how to stop', keyword: 'exercise consistency' },
  { category: 'fitness', cluster: 'The mental side', title: "How to enjoy exercise if you've always hated it", keyword: 'enjoying exercise' },

  // === NUTRITION (50) ===
  { category: 'nutrition', cluster: 'Macronutrient basics', title: 'Protein 101: how much you really need and why', keyword: 'daily protein intake' },
  { category: 'nutrition', cluster: 'Macronutrient basics', title: 'Are carbs really bad for you?', keyword: 'carbs healthy' },
  { category: 'nutrition', cluster: 'Macronutrient basics', title: 'Understanding healthy fats vs unhealthy fats', keyword: 'dietary fats explained' },
  { category: 'nutrition', cluster: 'Macronutrient basics', title: "Why fibre is the most important nutrient you're ignoring", keyword: 'fibre health benefits' },
  { category: 'nutrition', cluster: 'Macronutrient basics', title: 'How to read a food label like a dietitian', keyword: 'reading food labels' },
  // Vitamins/minerals
  { category: 'nutrition', cluster: 'Vitamins & minerals', title: 'Vitamin D deficiency: signs, causes, and how to fix it', keyword: 'vitamin D deficiency' },
  { category: 'nutrition', cluster: 'Vitamins & minerals', title: 'Iron deficiency in women: symptoms and solutions', keyword: 'iron deficiency women' },
  { category: 'nutrition', cluster: 'Vitamins & minerals', title: "Why most South Africans aren't getting enough magnesium", keyword: 'magnesium deficiency' },
  { category: 'nutrition', cluster: 'Vitamins & minerals', title: 'Calcium: how much you need and the best food sources', keyword: 'calcium intake' },
  { category: 'nutrition', cluster: 'Vitamins & minerals', title: "B12: who needs to supplement and who doesn't", keyword: 'vitamin B12 supplement' },
  { category: 'nutrition', cluster: 'Vitamins & minerals', title: 'The vitamins worth taking and the ones to skip', keyword: 'multivitamins worth it' },
  // Diets
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'The Mediterranean diet: why it keeps winning', keyword: 'mediterranean diet benefits' },
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'Intermittent fasting: who it works for and who should avoid it', keyword: 'intermittent fasting' },
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'The truth about gluten-free for non-celiacs', keyword: 'gluten free diet' },
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'Vegetarian and vegan eating in South Africa: a complete guide', keyword: 'vegan diet SA' },
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'Low-carb vs low-fat: what the evidence actually says', keyword: 'low carb low fat' },
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'The DASH diet for high blood pressure', keyword: 'DASH diet hypertension' },
  { category: 'nutrition', cluster: 'Eating patterns & diets', title: 'Why "clean eating" is misleading and what to focus on instead', keyword: 'clean eating myth' },
  // Practical
  { category: 'nutrition', cluster: 'Practical eating', title: 'How to meal prep for a busy week in 90 minutes', keyword: 'meal prep weekly' },
  { category: 'nutrition', cluster: 'Practical eating', title: 'Budget-friendly healthy eating in South Africa', keyword: 'healthy eating budget SA' },
  { category: 'nutrition', cluster: 'Practical eating', title: 'Healthy lunchbox ideas your kids will actually eat', keyword: 'kids lunchbox ideas' },
  { category: 'nutrition', cluster: 'Practical eating', title: 'Eating out: how to choose well at SA restaurants', keyword: 'eating out healthy' },
  { category: 'nutrition', cluster: 'Practical eating', title: 'The simplest plate method for portion control', keyword: 'plate method portions' },
  // Hydration
  { category: 'nutrition', cluster: 'Hydration', title: 'How much water do you actually need each day', keyword: 'daily water intake' },
  { category: 'nutrition', cluster: 'Hydration', title: 'The truth about electrolyte drinks and rehydration', keyword: 'electrolyte drinks' },
  { category: 'nutrition', cluster: 'Hydration', title: 'Coffee and tea: how much is too much', keyword: 'caffeine intake limits' },
  // Weight
  { category: 'nutrition', cluster: 'Weight loss', title: 'Why most diets fail and what to do instead', keyword: 'diet failure reasons' },
  { category: 'nutrition', cluster: 'Weight loss', title: 'Calorie deficits explained simply', keyword: 'calorie deficit weight loss' },
  { category: 'nutrition', cluster: 'Weight loss', title: 'The role of sleep in weight loss', keyword: 'sleep weight loss' },
  { category: 'nutrition', cluster: 'Weight loss', title: "Why you can't out-exercise a bad diet", keyword: 'diet versus exercise' },
  { category: 'nutrition', cluster: 'Weight loss', title: 'Setting realistic weight loss expectations', keyword: 'realistic weight loss' },
  // Sports
  { category: 'nutrition', cluster: 'Sports nutrition', title: 'What to eat to fuel a long run or ride', keyword: 'endurance fuel' },
  { category: 'nutrition', cluster: 'Sports nutrition', title: 'Recovery nutrition: what to eat after training', keyword: 'recovery meal' },
  { category: 'nutrition', cluster: 'Sports nutrition', title: 'Are protein shakes worth it?', keyword: 'protein shakes worth it' },
  { category: 'nutrition', cluster: 'Sports nutrition', title: "Hydration strategies for SA's heat", keyword: 'hot weather hydration' },
  // Family
  { category: 'nutrition', cluster: 'Family nutrition', title: 'Building healthy eating habits in young children', keyword: 'kids healthy eating' },
  { category: 'nutrition', cluster: 'Family nutrition', title: "Picky eating: what works and what doesn't", keyword: 'picky eater strategies' },
  { category: 'nutrition', cluster: 'Family nutrition', title: 'School lunches that fuel learning', keyword: 'school lunch nutrition' },
  { category: 'nutrition', cluster: 'Family nutrition', title: 'Nutrition during pregnancy', keyword: 'pregnancy nutrition' },
  { category: 'nutrition', cluster: 'Family nutrition', title: 'Feeding teenagers well without the battles', keyword: 'teenage nutrition' },
  // Gut
  { category: 'nutrition', cluster: 'Gut health', title: 'Probiotics and prebiotics: what they actually do', keyword: 'probiotics prebiotics' },
  { category: 'nutrition', cluster: 'Gut health', title: 'The gut-brain connection: how food affects mood', keyword: 'gut brain axis' },
  { category: 'nutrition', cluster: 'Gut health', title: 'How to improve your gut microbiome through food', keyword: 'gut microbiome diet' },
  { category: 'nutrition', cluster: 'Gut health', title: 'Fermented foods worth eating regularly', keyword: 'fermented foods benefits' },
  { category: 'nutrition', cluster: 'Gut health', title: 'Identifying food intolerances safely', keyword: 'food intolerance test' },
  // SA foods
  { category: 'nutrition', cluster: 'SA foods & traditions', title: 'The health benefits of pap, maize, and traditional staples', keyword: 'pap nutrition' },
  { category: 'nutrition', cluster: 'SA foods & traditions', title: 'Rooibos vs green tea: which is better for you', keyword: 'rooibos vs green tea' },
  { category: 'nutrition', cluster: 'SA foods & traditions', title: 'Amasi, mageu, and other SA fermented foods', keyword: 'amasi health benefits' },
  { category: 'nutrition', cluster: 'SA foods & traditions', title: 'Cooking healthier braais without losing the joy', keyword: 'healthy braai' },
  { category: 'nutrition', cluster: 'SA foods & traditions', title: "The truth about biltong's nutritional value", keyword: 'biltong nutrition' },

  // === MENTAL HEALTH (50) ===
  { category: 'mental_health', cluster: 'Anxiety', title: 'Recognising the early signs of anxiety in yourself', keyword: 'anxiety symptoms' },
  { category: 'mental_health', cluster: 'Anxiety', title: 'Daily habits that ease anxiety naturally', keyword: 'natural anxiety relief' },
  { category: 'mental_health', cluster: 'Anxiety', title: 'Generalised anxiety disorder explained', keyword: 'GAD symptoms treatment' },
  { category: 'mental_health', cluster: 'Anxiety', title: 'Social anxiety: how to manage it day to day', keyword: 'social anxiety help' },
  { category: 'mental_health', cluster: 'Anxiety', title: 'Panic attacks: what to do in the moment', keyword: 'panic attack help' },
  { category: 'mental_health', cluster: 'Anxiety', title: 'Health anxiety: when worry becomes the problem', keyword: 'health anxiety' },
  // Depression
  { category: 'mental_health', cluster: 'Depression', title: 'The difference between sadness and depression', keyword: 'sadness vs depression' },
  { category: 'mental_health', cluster: 'Depression', title: 'Subtle signs of depression in men', keyword: 'depression in men' },
  { category: 'mental_health', cluster: 'Depression', title: 'How exercise helps treat depression', keyword: 'exercise depression' },
  { category: 'mental_health', cluster: 'Depression', title: 'Postpartum depression in South Africa: getting help', keyword: 'postpartum depression SA' },
  { category: 'mental_health', cluster: 'Depression', title: 'Living with someone who has depression', keyword: 'supporting depressed partner' },
  // Stress
  { category: 'mental_health', cluster: 'Stress', title: 'Chronic stress: what it does to your body', keyword: 'chronic stress effects' },
  { category: 'mental_health', cluster: 'Stress', title: 'Five-minute techniques for acute stress', keyword: 'stress relief quick' },
  { category: 'mental_health', cluster: 'Stress', title: 'Burnout: spotting it before it breaks you', keyword: 'burnout warning signs' },
  { category: 'mental_health', cluster: 'Stress', title: 'Stress eating: why it happens and how to stop', keyword: 'stress eating habit' },
  { category: 'mental_health', cluster: 'Stress', title: 'Building stress resilience week by week', keyword: 'stress resilience' },
  // Sleep
  { category: 'mental_health', cluster: 'Sleep', title: 'How to fix your sleep schedule', keyword: 'sleep schedule fix' },
  { category: 'mental_health', cluster: 'Sleep', title: 'Insomnia: causes and proven treatments', keyword: 'insomnia treatment' },
  { category: 'mental_health', cluster: 'Sleep', title: 'Why you wake up at 3am every night', keyword: 'waking up 3am' },
  { category: 'mental_health', cluster: 'Sleep', title: 'Sleep hygiene basics that actually work', keyword: 'sleep hygiene' },
  { category: 'mental_health', cluster: 'Sleep', title: 'The link between sleep and mental illness', keyword: 'sleep mental health' },
  // Relationships
  { category: 'mental_health', cluster: 'Relationships & connection', title: 'Loneliness in modern South Africa', keyword: 'loneliness SA' },
  { category: 'mental_health', cluster: 'Relationships & connection', title: 'How to make new friends as an adult', keyword: 'making friends adult' },
  { category: 'mental_health', cluster: 'Relationships & connection', title: 'The mental health cost of social media', keyword: 'social media mental health' },
  { category: 'mental_health', cluster: 'Relationships & connection', title: 'Setting boundaries with family without breaking ties', keyword: 'family boundaries' },
  // Work
  { category: 'mental_health', cluster: 'Workplace mental health', title: 'Talking to your boss about mental health', keyword: 'mental health work' },
  { category: 'mental_health', cluster: 'Workplace mental health', title: 'Working from home and isolation', keyword: 'remote work isolation' },
  { category: 'mental_health', cluster: 'Workplace mental health', title: 'Imposter syndrome: what it is and how to manage it', keyword: 'imposter syndrome' },
  { category: 'mental_health', cluster: 'Workplace mental health', title: 'Recognising workplace bullying', keyword: 'workplace bullying' },
  { category: 'mental_health', cluster: 'Workplace mental health', title: 'Taking a mental health day: how and when', keyword: 'mental health day' },
  // Children
  { category: 'mental_health', cluster: 'Children & teens', title: 'Teen depression: signs parents miss', keyword: 'teenage depression signs' },
  { category: 'mental_health', cluster: 'Children & teens', title: 'Anxiety in children: when to worry', keyword: 'childhood anxiety' },
  { category: 'mental_health', cluster: 'Children & teens', title: 'Talking to kids about mental health', keyword: 'talking children mental health' },
  { category: 'mental_health', cluster: 'Children & teens', title: 'The impact of phones on teen mental health', keyword: 'teens phones mental health' },
  { category: 'mental_health', cluster: 'Children & teens', title: 'School pressure and how to support your child', keyword: 'school pressure' },
  // Trauma
  { category: 'mental_health', cluster: 'Trauma & PTSD', title: 'Understanding PTSD beyond the war stories', keyword: 'PTSD civilian' },
  { category: 'mental_health', cluster: 'Trauma & PTSD', title: "Childhood trauma's lifelong effects", keyword: 'childhood trauma adults' },
  { category: 'mental_health', cluster: 'Trauma & PTSD', title: "How to support someone who's been through trauma", keyword: 'supporting trauma survivor' },
  { category: 'mental_health', cluster: 'Trauma & PTSD', title: 'EMDR and other trauma therapies explained', keyword: 'EMDR therapy' },
  // Treatment
  { category: 'mental_health', cluster: 'Therapy & treatment', title: 'How to find a therapist in South Africa', keyword: 'finding therapist SA' },
  { category: 'mental_health', cluster: 'Therapy & treatment', title: 'CBT explained: what it is and who it helps', keyword: 'CBT therapy' },
  { category: 'mental_health', cluster: 'Therapy & treatment', title: 'Antidepressants: what to expect when starting', keyword: 'starting antidepressants' },
  { category: 'mental_health', cluster: 'Therapy & treatment', title: 'Therapy types: CBT vs DBT vs psychodynamic', keyword: 'therapy types compared' },
  { category: 'mental_health', cluster: 'Therapy & treatment', title: 'SADAG and free mental health resources in SA', keyword: 'SADAG helpline SA' },
  // Self-care
  { category: 'mental_health', cluster: 'Self-care & resilience', title: 'Meditation for total beginners', keyword: 'meditation beginner' },
  { category: 'mental_health', cluster: 'Self-care & resilience', title: 'Journaling: why and how to start', keyword: 'journaling mental health' },
  { category: 'mental_health', cluster: 'Self-care & resilience', title: 'The science of gratitude practices', keyword: 'gratitude science' },
  { category: 'mental_health', cluster: 'Self-care & resilience', title: 'Building emotional resilience after loss', keyword: 'emotional resilience grief' },
  { category: 'mental_health', cluster: 'Self-care & resilience', title: 'When self-care becomes avoidance', keyword: 'toxic self care' },
  { category: 'mental_health', cluster: 'Self-care & resilience', title: 'How nature improves mental health', keyword: 'nature mental health' },

  // === HEALTH GUIDES (50) ===
  { category: 'health_guides', cluster: 'Heart health', title: 'Understanding your blood pressure numbers', keyword: 'blood pressure explained' },
  { category: 'health_guides', cluster: 'Heart health', title: 'Cholesterol: good, bad, and what to do about it', keyword: 'cholesterol guide' },
  { category: 'health_guides', cluster: 'Heart health', title: 'Heart attack warning signs in men and women', keyword: 'heart attack signs' },
  { category: 'health_guides', cluster: 'Heart health', title: 'Lifestyle changes that actually lower heart disease risk', keyword: 'heart disease prevention' },
  { category: 'health_guides', cluster: 'Heart health', title: "Atrial fibrillation: what it is and how it's treated", keyword: 'atrial fibrillation' },
  { category: 'health_guides', cluster: 'Heart health', title: 'Why high blood pressure is called the silent killer', keyword: 'silent hypertension' },
  // Diabetes
  { category: 'health_guides', cluster: 'Diabetes', title: 'Type 2 diabetes: prevention and early detection', keyword: 'diabetes prevention' },
  { category: 'health_guides', cluster: 'Diabetes', title: 'The link between sugar and diabetes', keyword: 'sugar diabetes risk' },
  { category: 'health_guides', cluster: 'Diabetes', title: 'Living well with type 1 diabetes', keyword: 'type 1 diabetes management' },
  { category: 'health_guides', cluster: 'Diabetes', title: "Pre-diabetes: reversing it before it's too late", keyword: 'prediabetes reversal' },
  { category: 'health_guides', cluster: 'Diabetes', title: "Diabetes care in South Africa: what's available", keyword: 'diabetes care SA' },
  // Women
  { category: 'health_guides', cluster: "Women's health", title: 'Understanding your menstrual cycle', keyword: 'menstrual cycle explained' },
  { category: 'health_guides', cluster: "Women's health", title: 'PCOS: signs, diagnosis, and management', keyword: 'PCOS symptoms' },
  { category: 'health_guides', cluster: "Women's health", title: 'Endometriosis explained', keyword: 'endometriosis guide' },
  { category: 'health_guides', cluster: "Women's health", title: 'Cervical cancer screening: what you need to know', keyword: 'cervical cancer screening' },
  { category: 'health_guides', cluster: "Women's health", title: 'Menopause: symptoms, stages, and treatments', keyword: 'menopause guide' },
  { category: 'health_guides', cluster: "Women's health", title: 'Fertility: factors that affect it and when to seek help', keyword: 'fertility factors' },
  // Men
  { category: 'health_guides', cluster: "Men's health", title: 'Prostate health: what men should know by 50', keyword: 'prostate health men' },
  { category: 'health_guides', cluster: "Men's health", title: 'Testosterone: facts vs marketing claims', keyword: 'testosterone facts' },
  { category: 'health_guides', cluster: "Men's health", title: 'Why men avoid doctors and how to change that', keyword: 'men doctor avoidance' },
  { category: 'health_guides', cluster: "Men's health", title: 'Erectile dysfunction: causes and treatments', keyword: 'ED treatment' },
  { category: 'health_guides', cluster: "Men's health", title: 'Male depression looks different', keyword: 'male depression signs' },
  // Common illness
  { category: 'health_guides', cluster: 'Common illnesses', title: 'Cold vs flu vs COVID: knowing the difference', keyword: 'cold flu covid difference' },
  { category: 'health_guides', cluster: 'Common illnesses', title: 'When a headache needs medical attention', keyword: 'headache when worry' },
  { category: 'health_guides', cluster: 'Common illnesses', title: 'UTIs: prevention and treatment', keyword: 'UTI prevention' },
  { category: 'health_guides', cluster: 'Common illnesses', title: 'Heartburn and reflux: causes and relief', keyword: 'heartburn relief' },
  { category: 'health_guides', cluster: 'Common illnesses', title: 'Allergic rhinitis: causes and management', keyword: 'hay fever management' },
  { category: 'health_guides', cluster: 'Common illnesses', title: 'Common skin rashes and what they mean', keyword: 'skin rash identification' },
  // Prevention
  { category: 'health_guides', cluster: 'Preventive care', title: 'Health screenings every decade', keyword: 'health screenings age' },
  { category: 'health_guides', cluster: 'Preventive care', title: 'Vaccinations adults still need', keyword: 'adult vaccinations' },
  { category: 'health_guides', cluster: 'Preventive care', title: 'Cancer screenings: what, when, and how often', keyword: 'cancer screening guide' },
  { category: 'health_guides', cluster: 'Preventive care', title: 'Eye health: signs you need an eye test', keyword: 'eye exam frequency' },
  { category: 'health_guides', cluster: 'Preventive care', title: 'Dental health beyond brushing', keyword: 'dental health adults' },
  // SA system
  { category: 'health_guides', cluster: 'SA health system', title: 'Navigating private vs public healthcare in SA', keyword: 'private vs public healthcare SA' },
  { category: 'health_guides', cluster: 'SA health system', title: 'Medical aid: choosing the right plan', keyword: 'medical aid plan choice' },
  { category: 'health_guides', cluster: 'SA health system', title: 'NHI explained simply', keyword: 'NHI explained' },
  { category: 'health_guides', cluster: 'SA health system', title: 'SAMRC, NICD, HPCSA: who does what', keyword: 'SA health bodies' },
  { category: 'health_guides', cluster: 'SA health system', title: 'Free clinics and what they offer', keyword: 'free clinic services SA' },
  // Chronic
  { category: 'health_guides', cluster: 'Chronic conditions', title: 'Living with thyroid disorders', keyword: 'thyroid disorders' },
  { category: 'health_guides', cluster: 'Chronic conditions', title: 'Managing asthma year-round', keyword: 'asthma management' },
  { category: 'health_guides', cluster: 'Chronic conditions', title: 'Migraine: triggers, treatment, prevention', keyword: 'migraine treatment' },
  { category: 'health_guides', cluster: 'Chronic conditions', title: 'IBS: living well with it', keyword: 'IBS management' },
  { category: 'health_guides', cluster: 'Chronic conditions', title: 'Living with hypertension long-term', keyword: 'long term hypertension' },
  // Emergency
  { category: 'health_guides', cluster: 'Emergency knowledge', title: 'Recognising a stroke FAST', keyword: 'stroke signs FAST' },
  { category: 'health_guides', cluster: 'Emergency knowledge', title: 'When chest pain is an emergency', keyword: 'chest pain emergency' },
  { category: 'health_guides', cluster: 'Emergency knowledge', title: 'Anaphylaxis: signs and emergency response', keyword: 'anaphylaxis emergency' },
  { category: 'health_guides', cluster: 'Emergency knowledge', title: 'First aid basics every adult should know', keyword: 'first aid basics' },
  // Pain & fatigue
  { category: 'health_guides', cluster: 'Pain, fatigue & sleep', title: 'Chronic fatigue: when tiredness needs investigating', keyword: 'chronic fatigue causes' },
  { category: 'health_guides', cluster: 'Pain, fatigue & sleep', title: "Back pain: when it's serious", keyword: 'back pain serious' },
  { category: 'health_guides', cluster: 'Pain, fatigue & sleep', title: 'Joint pain: arthritis vs injury', keyword: 'arthritis vs injury' },

  // === BEAUTY (50) ===
  { category: 'beauty', cluster: 'Skincare basics', title: 'Building a skincare routine that actually works', keyword: 'basic skincare routine' },
  { category: 'beauty', cluster: 'Skincare basics', title: 'Cleansers: how to pick one for your skin', keyword: 'choosing cleanser' },
  { category: 'beauty', cluster: 'Skincare basics', title: 'The truth about toners: do you need one', keyword: 'toners necessary' },
  { category: 'beauty', cluster: 'Skincare basics', title: 'Moisturisers: how to choose for your skin type', keyword: 'moisturiser skin type' },
  { category: 'beauty', cluster: 'Skincare basics', title: 'Serums explained: which one for which problem', keyword: 'serums explained' },
  { category: 'beauty', cluster: 'Skincare basics', title: 'Eye creams: worth it or marketing?', keyword: 'eye cream worth it' },
  // Sun
  { category: 'beauty', cluster: 'Sun protection', title: 'SPF in South Africa: what you actually need', keyword: 'SPF South Africa' },
  { category: 'beauty', cluster: 'Sun protection', title: 'Sunscreen myths busted', keyword: 'sunscreen myths' },
  { category: 'beauty', cluster: 'Sun protection', title: 'Chemical vs mineral sunscreen', keyword: 'chemical mineral sunscreen' },
  { category: 'beauty', cluster: 'Sun protection', title: 'Sun damage at every age and how to prevent it', keyword: 'sun damage skin' },
  { category: 'beauty', cluster: 'Sun protection', title: 'Reapplying sunscreen: the question everyone asks', keyword: 'reapply sunscreen' },
  // Conditions
  { category: 'beauty', cluster: 'Skin conditions', title: 'Adult acne: causes and treatments', keyword: 'adult acne treatment' },
  { category: 'beauty', cluster: 'Skin conditions', title: 'Rosacea: what it is and how to manage it', keyword: 'rosacea management' },
  { category: 'beauty', cluster: 'Skin conditions', title: 'Eczema flares and how to calm them', keyword: 'eczema treatment' },
  { category: 'beauty', cluster: 'Skin conditions', title: 'Dark spots and hyperpigmentation: what works', keyword: 'hyperpigmentation treatment' },
  { category: 'beauty', cluster: 'Skin conditions', title: 'Hidradenitis suppurativa: a guide', keyword: 'hidradenitis suppurativa' },
  // Hair
  { category: 'beauty', cluster: 'Hair care', title: 'Hair washing: how often is right?', keyword: 'hair wash frequency' },
  { category: 'beauty', cluster: 'Hair care', title: 'Caring for natural and afro-textured hair', keyword: 'natural hair care' },
  { category: 'beauty', cluster: 'Hair care', title: 'Hair loss in women: causes and treatments', keyword: 'female hair loss' },
  { category: 'beauty', cluster: 'Hair care', title: 'Hair loss in men: what actually works', keyword: 'male hair loss' },
  { category: 'beauty', cluster: 'Hair care', title: 'Scalp health: the foundation of good hair', keyword: 'scalp health' },
  { category: 'beauty', cluster: 'Hair care', title: 'Heat damage: prevention and repair', keyword: 'heat damaged hair' },
  // Skin of colour
  { category: 'beauty', cluster: 'Skin of colour', title: 'Skincare for darker skin tones', keyword: 'skincare darker skin' },
  { category: 'beauty', cluster: 'Skin of colour', title: 'Hyperpigmentation on melanin-rich skin', keyword: 'hyperpigmentation dark skin' },
  { category: 'beauty', cluster: 'Skin of colour', title: 'Choosing makeup for deeper skin tones', keyword: 'makeup dark skin tones' },
  { category: 'beauty', cluster: 'Skin of colour', title: 'Sunscreen for darker skin: still essential', keyword: 'sunscreen melanin skin' },
  { category: 'beauty', cluster: 'Skin of colour', title: 'SA-specific skincare brands for diverse skin', keyword: 'SA skincare brands' },
  // Anti-ageing
  { category: 'beauty', cluster: 'Anti-ageing', title: 'The science of skin ageing', keyword: 'skin ageing science' },
  { category: 'beauty', cluster: 'Anti-ageing', title: 'Retinoids: when to start and how to use them', keyword: 'retinol use' },
  { category: 'beauty', cluster: 'Anti-ageing', title: 'Wrinkles and fine lines: prevention vs treatment', keyword: 'wrinkle treatment' },
  { category: 'beauty', cluster: 'Anti-ageing', title: 'Botox and fillers explained', keyword: 'botox fillers explained' },
  { category: 'beauty', cluster: 'Anti-ageing', title: 'Anti-ageing for hands and neck', keyword: 'hands neck ageing' },
  // Makeup
  { category: 'beauty', cluster: 'Makeup', title: 'Building a basic makeup kit on a budget', keyword: 'basic makeup kit' },
  { category: 'beauty', cluster: 'Makeup', title: 'Foundation match: how to get it right', keyword: 'foundation match' },
  { category: 'beauty', cluster: 'Makeup', title: 'Everyday makeup that actually lasts in SA heat', keyword: 'long lasting makeup heat' },
  { category: 'beauty', cluster: 'Makeup', title: 'Makeup brushes: which ones matter', keyword: 'essential makeup brushes' },
  { category: 'beauty', cluster: 'Makeup', title: 'Removing makeup properly without damaging skin', keyword: 'makeup removal' },
  // Nails
  { category: 'beauty', cluster: 'Nails', title: 'Healthy nails: signs and care', keyword: 'healthy nails signs' },
  { category: 'beauty', cluster: 'Nails', title: 'Gel manicures: risks and best practices', keyword: 'gel manicure risks' },
  { category: 'beauty', cluster: 'Nails', title: 'Common nail problems and what they mean', keyword: 'nail problems guide' },
  // Body
  { category: 'beauty', cluster: 'Body care', title: 'Body acne: causes and treatment', keyword: 'body acne treatment' },
  { category: 'beauty', cluster: 'Body care', title: 'Stretch marks: prevention vs treatment', keyword: 'stretch mark treatment' },
  { category: 'beauty', cluster: 'Body care', title: 'Cellulite: the science and what actually helps', keyword: 'cellulite treatment' },
  { category: 'beauty', cluster: 'Body care', title: 'Caring for hands and feet', keyword: 'hand foot care' },
  { category: 'beauty', cluster: 'Body care', title: 'Body exfoliation: how often and how', keyword: 'body exfoliation' },
  // Natural
  { category: 'beauty', cluster: 'Natural & DIY', title: 'Natural skincare ingredients worth trusting', keyword: 'natural skincare ingredients' },
  { category: 'beauty', cluster: 'Natural & DIY', title: 'DIY beauty: what to try and what to avoid', keyword: 'DIY beauty safe' },
  { category: 'beauty', cluster: 'Natural & DIY', title: 'Coconut oil: hype vs reality for skin and hair', keyword: 'coconut oil skin' },
  { category: 'beauty', cluster: 'Natural & DIY', title: 'African botanicals in skincare', keyword: 'african botanicals skin' },
  { category: 'beauty', cluster: 'Natural & DIY', title: "Are 'clean beauty' brands actually better?", keyword: 'clean beauty truth' },
];

// Helper: get unique cluster names per category from blueprint
export function blueprintClusters(category) {
  const set = new Set();
  EVERGREEN_BLUEPRINT.filter(t => t.category === category).forEach(t => set.add(t.cluster));
  return [...set];
}
