
import { MessageCircle, Code, Database, Brain, Users, Terminal } from "lucide-react";

export const ROLES = [
  {
    id: "software-dev",
    title: "Software Developer",
    icon: Code,
    description: "System design, algorithms, and full-stack development.",
    questions: [
      "Can you explain the difference between REST and GraphQL?",
      "How do you handle state management in complex React applications?",
      "Describe a challenging bug you fixed and your approach.",
      "Explain the SOLID principles and why they matter.",
      "How do you design a scalable API for high traffic?",
      "What is a database transaction and what does ACID mean?",
      "Describe how the Node.js event loop works.",
      "How do you approach optimizing performance in a web app?",
      "Explain the differences between monoliths and microservices.",
      "How do you test and validate your code (unit, integration, e2e)?"
    ],
    qa: [
      {
        question: "Can you explain the difference between REST and GraphQL?",
        sampleAnswer: "REST uses HTTP endpoints for different resources with fixed data structures. GraphQL is query language that allows clients to request specific data they need, reducing over-fetching and under-fetching.",
        keywords: ["HTTP", "endpoints", "resources", "query", "client", "data", "over-fetching", "under-fetching"]
      },
      {
        question: "How do you handle state management in complex React applications?",
        sampleAnswer: "Use Context API for smaller apps or Redux/Zustand for larger ones. State should be lifted up, and consider using custom hooks for reusable logic.",
        keywords: ["Context", "Redux", "Zustand", "state", "hooks", "lifted", "reusable"]
      },
      {
        question: "Explain the SOLID principles and why they matter.",
        sampleAnswer: "SOLID stands for Single-responsibility, Open-closed, Liskov substitution, Interface segregation, and Dependency inversion. They help create maintainable, testable, and extensible code.",
        keywords: ["Single-responsibility", "Open-closed", "Liskov", "Interface segregation", "Dependency inversion", "maintainable", "extensible"]
      },
      {
        question: "How do you design a scalable API for high traffic?",
        sampleAnswer: "Design with stateless services, caching (CDN, Redis), rate limiting, pagination, horizontal scaling, load balancers, and efficient DB indexing. Use monitoring and autoscaling.",
        keywords: ["stateless", "caching", "Redis", "pagination", "horizontal", "load balancer", "indexing", "monitoring"]
      },
      {
        question: "What is a database transaction and what does ACID mean?",
        sampleAnswer: "A transaction is a group of operations treated as a single unit. ACID: Atomicity, Consistency, Isolation, Durability — properties that ensure reliable transactions.",
        keywords: ["transaction", "atomicity", "consistency", "isolation", "durability", "reliable"]
      },
      {
        question: "Describe how the Node.js event loop works.",
        sampleAnswer: "The event loop handles async callbacks by processing microtasks and macrotasks (timers, IO). It allows single-threaded concurrency by offloading work to the libuv thread pool.",
        keywords: ["event loop", "async", "callbacks", "microtasks", "macrotasks", "libuv", "thread pool"]
      },
      {
        question: "How do you approach optimizing performance in a web app?",
        sampleAnswer: "Profile to find bottlenecks, reduce network requests, use lazy loading, optimize images, minimize JS/CSS, implement caching, and optimize DB queries.",
        keywords: ["profiling", "lazy loading", "caching", "optimize", "images", "minify", "DB queries"]
      },
      {
        question: "Explain the differences between monoliths and microservices.",
        sampleAnswer: "Monolith: single deployable app, simpler initial development but harder to scale. Microservices: many small services, easier to scale independently but adds operational complexity.",
        keywords: ["monolith", "microservices", "deploy", "scale", "operational", "independent"]
      },
      {
        question: "How do you test and validate your code (unit, integration, e2e)?",
        sampleAnswer: "Use unit tests for small units, integration tests to validate module interactions, and e2e for system-level flows. Automate in CI pipeline and mock external deps.",
        keywords: ["unit tests", "integration", "e2e", "CI", "mock", "automation"]
      },
      {
        question: "Describe a challenging bug you fixed and your approach.",
        sampleAnswer: "Encountered race condition in async updates. Used debugging tools, added logging, identified timing issue, and fixed with Promise handling.",
        keywords: ["race", "condition", "async", "debugging", "logging", "Promise", "timing"]
      }
    ]
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    icon: Database,
    description: "Statistical analysis, machine learning models, and data viz.",
    questions: [
      "Explain the bias-variance tradeoff.",
      "How do you handle missing data in a dataset?",
      "What is the difference between supervised and unsupervised learning?",
      "Describe cross-validation and why it's important.",
      "How do you perform feature engineering for a tabular dataset?",
      "How do you handle class imbalance in classification tasks?",
      "Explain regularization (L1 vs L2) and when to use them.",
      "Describe principal component analysis (PCA) and when to apply it.",
      "How would you evaluate an A/B test?",
      "How do you deploy a model to production and monitor it?"
    ],
    qa: [
      {
        question: "Explain the bias-variance tradeoff.",
        sampleAnswer: "Bias is error from assumptions, variance is sensitivity to training data. High bias = underfitting, high variance = overfitting. Must balance both.",
        keywords: ["bias", "variance", "error", "assumptions", "training", "underfitting", "overfitting", "balance"]
      },
      {
        question: "How do you handle missing data in a dataset?",
        sampleAnswer: "Depends on % missing. Can remove rows/columns, impute with mean/median, use predictive models, or use algorithms that handle missing values.",
        keywords: ["missing", "data", "remove", "impute", "mean", "median", "algorithms", "predictive"]
      },
      {
        question: "Describe cross-validation and why it's important.",
        sampleAnswer: "Cross-validation (e.g., k-fold) splits data into training/validation folds to estimate model performance robustly and reduce overfitting risk.",
        keywords: ["cross-validation", "k-fold", "validation", "overfitting", "generalization"]
      },
      {
        question: "How do you perform feature engineering for a tabular dataset?",
        sampleAnswer: "Create meaningful features, handle categorical encoding, scale/normalize, create interaction terms, and use domain knowledge. Validate with feature importance.",
        keywords: ["feature engineering", "encoding", "scaling", "interaction", "importance", "domain"]
      },
      {
        question: "How do you handle class imbalance in classification tasks?",
        sampleAnswer: "Use resampling (oversample/undersample), class weights, synthetic data (SMOTE), or choose appropriate metrics like F1/AUC.",
        keywords: ["imbalance", "oversample", "undersample", "SMOTE", "class weights", "F1", "AUC"]
      },
      {
        question: "Explain regularization (L1 vs L2) and when to use them.",
        sampleAnswer: "L1 (Lasso) promotes sparsity and feature selection, L2 (Ridge) penalizes large weights to reduce overfitting. Choose based on feature selection needs.",
        keywords: ["L1", "L2", "Lasso", "Ridge", "sparsity", "overfitting", "penalty"]
      },
      {
        question: "Describe principal component analysis (PCA) and when to apply it.",
        sampleAnswer: "PCA reduces dimensionality by projecting data to orthogonal components that capture max variance. Use for noise reduction and visualization.",
        keywords: ["PCA", "dimensionality", "variance", "components", "visualization", "noise"]
      },
      {
        question: "How would you evaluate an A/B test?",
        sampleAnswer: "Define metrics, ensure randomization, compute statistical significance (p-values, confidence intervals), check power and guardrail metrics, and monitor for bias.",
        keywords: ["A/B test", "randomization", "p-value", "confidence interval", "power", "metrics"]
      },
      {
        question: "How do you deploy a model to production and monitor it?",
        sampleAnswer: "Containerize model, expose via API, use CI/CD, add logging, monitor latency, accuracy drift, data distribution changes, and set alerts for degradation.",
        keywords: ["deployment", "API", "CI/CD", "logging", "drift", "monitoring", "alerts"]
      },
      {
        question: "What is the difference between supervised and unsupervised learning?",
        sampleAnswer: "Supervised learning uses labeled data to train (classification, regression). Unsupervised finds patterns in unlabeled data (clustering, dimensionality reduction).",
        keywords: ["supervised", "labeled", "classification", "regression", "unsupervised", "unlabeled", "clustering", "patterns"]
      }
    ]
  },
  {
    id: "ml-engineer",
    title: "ML Engineer",
    icon: Brain,
    description: "Model deployment, pipelines, and deep learning architectures.",
    questions: [
      "How would you optimize a transformer model for inference?",
      "Explain the vanishing gradient problem.",
      "What metrics do you use to evaluate a classification model?",
      "Describe a production ML data pipeline you would build.",
      "How do you version models and datasets?",
      "Explain batch vs online inference and when to use each.",
      "What methods do you use for hyperparameter tuning?",
      "How do you detect and handle model drift in production?",
      "Explain transfer learning and when it's useful.",
      "How do you scale distributed training across GPUs?"
    ],
    qa: [
      {
        question: "How would you optimize a transformer model for inference?",
        sampleAnswer: "Use quantization, pruning, knowledge distillation, batch processing, TensorRT or ONNX. Cache attention results. Consider model compression techniques.",
        keywords: ["quantization", "pruning", "distillation", "batch", "TensorRT", "ONNX", "cache", "compression"]
      },
      {
        question: "Describe a production ML data pipeline you would build.",
        sampleAnswer: "Ingest raw data, validate/clean, feature store generation, batch and streaming transforms, model training orchestration, and deploy with monitoring and retraining triggers.",
        keywords: ["ingest", "feature store", "ETL", "orchestration", "monitoring", "retraining"]
      },
      {
        question: "How do you version models and datasets?",
        sampleAnswer: "Use tools like DVC, MLFlow or Delta Lake to snapshot datasets, log model artifacts with hashes, track experiments and use semantic versioning for releases.",
        keywords: ["DVC", "MLFlow", "artifacts", "hash", "experiments", "versioning"]
      },
      {
        question: "Explain batch vs online inference and when to use each.",
        sampleAnswer: "Batch inference processes many inputs periodically (cost-efficient), online inference serves real-time requests with low latency. Choose based on latency and throughput needs.",
        keywords: ["batch", "online", "latency", "throughput", "real-time"]
      },
      {
        question: "What methods do you use for hyperparameter tuning?",
        sampleAnswer: "Grid search, random search, Bayesian optimization, Hyperband, and using validation curves. Automate with tools like Optuna or Ray Tune.",
        keywords: ["grid", "random", "Bayesian", "Hyperband", "Optuna", "Ray Tune"]
      },
      {
        question: "How do you detect and handle model drift in production?",
        sampleAnswer: "Monitor input/data distributions, prediction distributions, and performance metrics. Set alerts, trigger retraining, and use canary deployments to validate updated models.",
        keywords: ["drift", "monitor", "distribution", "retraining", "canary", "alerts"]
      },
      {
        question: "Explain transfer learning and when it's useful.",
        sampleAnswer: "Transfer learning reuses pretrained model weights and fine-tunes on target data. Useful when target dataset is small or compute resources are limited.",
        keywords: ["transfer learning", "pretrained", "fine-tune", "small data", "compute"]
      },
      {
        question: "How do you scale distributed training across GPUs?",
        sampleAnswer: "Use data parallelism (Horovod, PyTorch DDP), gradient accumulation, mixed precision, and efficient communication (NCCL). Profile to find bottlenecks.",
        keywords: ["data parallel", "DDP", "Horovod", "mixed precision", "NCCL", "gradient"]
      },
      {
        question: "Explain the vanishing gradient problem.",
        sampleAnswer: "In deep networks, gradients become very small during backprop, making weight updates negligible. ReLU, LSTM, skip connections help solve this.",
        keywords: ["gradients", "backpropagation", "small", "weights", "ReLU", "LSTM", "skip", "connections"]
      },
      {
        question: "What metrics do you use to evaluate a classification model?",
        sampleAnswer: "Accuracy, precision, recall, F1-score, ROC-AUC. Choose based on problem: imbalanced data use F1, medical use sensitivity.",
        keywords: ["accuracy", "precision", "recall", "F1", "ROC-AUC", "metrics", "imbalanced", "sensitivity"]
      }
    ]
  },
  {
    id: "hr-round",
    title: "HR Round",
    icon: Users,
    description: "Behavioral questions, culture fit, and soft skills.",
    questions: [
      "Tell me about a time you had a conflict with a coworker.",
      "Where do you see yourself in 5 years?",
      "Why do you want to work for this company?",
      "Describe a time you failed and what you learned.",
      "How do you handle tight deadlines and pressure?",
      "Give an example of when you showed leadership.",
      "How do you prioritize tasks when everything is important?",
      "What are your greatest strengths and weaknesses?",
      "How do you handle constructive feedback?",
      "Describe a time you improved a process at work."
    ],
    qa: [
      {
        question: "Tell me about a time you had a conflict with a coworker.",
        sampleAnswer: "Describe situation, action taken to resolve (communication, compromise), and positive outcome. Show EQ and problem-solving.",
        keywords: ["conflict", "communication", "compromise", "resolve", "situation", "action", "outcome"]
      },
      {
        question: "Where do you see yourself in 5 years?",
        sampleAnswer: "Career growth, learning new skills, taking on more responsibility, leadership roles. Aligned with company values.",
        keywords: ["growth", "skills", "responsibility", "leadership", "learning", "development", "aligned", "career"]
      },
      {
        question: "Describe a time you failed and what you learned.",
        sampleAnswer: "Briefly describe the failure, take responsibility, explain actions taken to recover and the lessons learned that improved future performance.",
        keywords: ["failure", "responsibility", "learning", "improvement", "reflection"]
      },
      {
        question: "How do you handle tight deadlines and pressure?",
        sampleAnswer: "Prioritize tasks, break work into milestones, communicate blockers early, and collaborate with teammates. Maintain focus and manage time.",
        keywords: ["prioritize", "milestones", "communication", "time management", "collaboration"]
      },
      {
        question: "Give an example of when you showed leadership.",
        sampleAnswer: "Describe context, actions to lead the team (mentoring, delegating, aligning goals), and the measurable outcome.",
        keywords: ["leadership", "mentoring", "delegation", "outcome", "alignment"]
      },
      {
        question: "How do you prioritize tasks when everything is important?",
        sampleAnswer: "Use impact vs effort, communicate with stakeholders, set clear deadlines, and focus on high-impact items first while managing expectations.",
        keywords: ["impact", "effort", "stakeholders", "deadlines", "communication"]
      },
      {
        question: "What are your greatest strengths and weaknesses?",
        sampleAnswer: "State a strength with an example; mention a genuine weakness and steps you are taking to improve it, focusing on growth.",
        keywords: ["strength", "weakness", "example", "improvement", "growth"]
      },
      {
        question: "How do you handle constructive feedback?",
        sampleAnswer: "Listen actively, ask clarifying questions, thank the giver, and create an action plan to incorporate the feedback.",
        keywords: ["feedback", "listen", "action plan", "improvement", "clarify"]
      },
      {
        question: "Describe a time you improved a process at work.",
        sampleAnswer: "Explain the inefficiency, the changes you made, how you implemented them, and the measurable improvement achieved.",
        keywords: ["process", "improvement", "implementation", "metrics", "efficiency"]
      },
      {
        question: "Why do you want to work for this company?",
        sampleAnswer: "Research company, mention specific projects, values alignment, growth opportunities, and genuine interest.",
        keywords: ["company", "research", "projects", "values", "opportunities", "growth", "interest", "alignment"]
      }
    ]
  },
  {
    id: "aptitude",
    title: "Aptitude",
    icon: Terminal,
    description: "Logical reasoning, puzzles, and problem-solving speed.",
    questions: [
      "If you have a 3-gallon jug and a 5-gallon jug, how do you measure 4 gallons?",
      "The day before yesterday was three days after Saturday. What day is it today?",
      "Estimate the number of piano tuners in Chicago.",
      "Find the next number in the series: 2, 6, 12, 20, ?",
      "Aman, Bimal and C are taking turns. If Aman is 2 years older than Bimal and Bimal is twice as old as C, express their ages given total 35.",
      "You have 8 balls, one is slightly heavier. How do you find it in 2 weighings?",
      "Probability: What is the chance of drawing 2 aces from a standard deck without replacement?",
      "If a pipe fills a tank in 10 hours and another in 15, how long together?",
      "If a car travels at 60 km/h for 1.5 hours and then 40 km/h for 2 hours, what is average speed?",
      "How would you estimate the height of a building using a barometer?"
    ],
    qa: [
      {
        question: "If you have a 3-gallon jug and a 5-gallon jug, how do you measure 4 gallons?",
        sampleAnswer: "Fill 3-gallon, pour into 5-gallon. Fill 3-gallon again, pour until 5-gallon is full (1 gallon remains in 3-gallon jug). Empty 5-gallon, move 1 gallon from 3-gallon. Fill 3-gallon, pour into 5-gallon. Now you have 4 gallons.",
        keywords: ["fill", "pour", "gallon", "3-gallon", "5-gallon", "measure", "logic", "steps"]
      },
      {
        question: "Find the next number in the series: 2, 6, 12, 20, ?",
        sampleAnswer: "Differences are 4,6,8 so next difference 10 → 20+10 = 30.",
        keywords: ["series", "differences", "pattern", "arithmetic progression"]
      },
      {
        question: "Aman, Bimal and C are taking turns. If Aman is 2 years older than Bimal and Bimal is twice as old as C, express their ages given total 35.",
        sampleAnswer: "Let C = x, Bimal = 2x, Aman = 2x+2. Sum = x+2x+2x+2 = 5x+2 = 35 → x=33/5 (6.6). Check for integers or rephrase; if integer ages expected adjust problem. Shows algebra setup.",
        keywords: ["algebra", "variables", "equation", "solve"]
      },
      {
        question: "You have 8 balls, one is slightly heavier. How do you find it in 2 weighings?",
        sampleAnswer: "Divide into 3,3,2. Weigh two groups of 3. If equal, heavier is in last 2 and one more weighing identifies it. If unequal, take heavier group of 3, weigh two of them; heavier is found or it's the unweighed one.",
        keywords: ["divide", "weigh", "groups", "logic", "strategy"]
      },
      {
        question: "Probability: What is the chance of drawing 2 aces from a standard deck without replacement?",
        sampleAnswer: "First ace: 4/52. Second: 3/51. Multiply → (4/52)*(3/51)=12/2652=1/221 ≈ 0.45%.",
        keywords: ["probability", "without replacement", "combinations", "calculation"]
      },
      {
        question: "If a pipe fills a tank in 10 hours and another in 15, how long together?",
        sampleAnswer: "Rates: 1/10 + 1/15 = (3+2)/30 = 5/30 = 1/6 → 6 hours.",
        keywords: ["rates", "LCM", "fraction", "together"]
      },
      {
        question: "If a car travels at 60 km/h for 1.5 hours and then 40 km/h for 2 hours, what is average speed?",
        sampleAnswer: "Total distance = 60*1.5 + 40*2 = 90 + 80 =170 km. Total time = 3.5 h. Avg speed = 170/3.5 ≈ 48.57 km/h.",
        keywords: ["average speed", "distance", "time", "calculation"]
      },
      {
        question: "How would you estimate the height of a building using a barometer?",
        sampleAnswer: "Multiple correct approaches: use barometer to measure pressure difference and convert to height, or use barometer as a length measure with string, or tie to a rope and lower it. Interviewers look for creativity and reasoning.",
        keywords: ["estimation", "pressure", "creative", "reasoning", "approach"]
      },
      {
        question: "The day before yesterday was three days after Saturday. What day is it today?",
        sampleAnswer: "If day before yesterday was 3 days after Saturday, then it was Tuesday. So today is Thursday.",
        keywords: ["day", "yesterday", "Saturday", "Tuesday", "Thursday", "logic", "three", "days"]
      },
      {
        question: "Estimate the number of piano tuners in Chicago.",
        sampleAnswer: "Population approach: ~3M people / 20 households = 150k households. ~1/30 have pianos = 5k pianos. Tune once/year, takes 2 hours. One tuner does ~250 pianos/year. So ~20 piano tuners.",
        keywords: ["population", "households", "pianos", "estimate", "tuner", "logic", "calculation", "approach"]
      }
    ]
  }
];

export const MOCK_PERFORMANCE_DATA = [
  { name: 'Jan', score: 65, confidence: 60 },
  { name: 'Feb', score: 72, confidence: 65 },
  { name: 'Mar', score: 68, confidence: 62 },
  { name: 'Apr', score: 85, confidence: 78 },
  { name: 'May', score: 82, confidence: 80 },
  { name: 'Jun', score: 91, confidence: 88 },
];

export const SKILL_radar_DATA = [
  { subject: 'Technical', A: 120, fullMark: 150 },
  { subject: 'Communication', A: 98, fullMark: 150 },
  { subject: 'Confidence', A: 86, fullMark: 150 },
  { subject: 'Problem Solving', A: 99, fullMark: 150 },
  { subject: 'Cultural Fit', A: 85, fullMark: 150 },
  { subject: 'Clarity', A: 65, fullMark: 150 },
];
