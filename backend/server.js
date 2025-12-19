const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kannada_summarizer', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Summary Schema
const summarySchema = new mongoose.Schema({
  originalText: { type: String, required: true },
  summarizedText: { type: String, required: true },
  model: { type: String, required: true },
  fileType: { type: String, default: 'text' },
  createdAt: { type: Date, default: Date.now },
  userId: String,
});

const Summary = mongoose.model('Summary', summarySchema);

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents allowed.'));
    }
  },
});

// Kannada Language Validation Function
function isKannadaText(text) {
  // Kannada Unicode range: U+0C80 to U+0CFF
  const kannadaRegex = /[\u0C80-\u0CFF]/g;
  
  const kannadaMatches = text.match(kannadaRegex);
  
  // Remove whitespace, punctuation, and numbers for accurate counting
  const cleanText = text.replace(/[\s\d\p{P}]/gu, '');
  
  if (!kannadaMatches || cleanText.length === 0) {
    return {
      isValid: false,
      percentage: 0,
      message: 'No Kannada text detected. Please provide text in Kannada script (ಕನ್ನಡ).'
    };
  }
  
  // Calculate percentage of Kannada characters
  const kannadaPercentage = (kannadaMatches.length / cleanText.length) * 100;
  
  // Require at least 70% Kannada characters
  const threshold = 70;
  
  if (kannadaPercentage < threshold) {
    return {
      isValid: false,
      percentage: kannadaPercentage.toFixed(2),
      message: `Text contains only ${kannadaPercentage.toFixed(2)}% Kannada characters. Please provide text primarily in Kannada script (minimum ${threshold}% required).`
    };
  }
  
  return {
    isValid: true,
    percentage: kannadaPercentage.toFixed(2),
    message: 'Valid Kannada text detected.'
  };
}

// Advanced Extractive Summarization Algorithm
function extractiveSummarization(text, algorithm = 'advanced') {
  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Split into sentences (supports both English and Kannada punctuation)
  const sentences = cleanText.match(/[^।.!?]+[।.!?]+/g) || [cleanText];
  
  if (sentences.length <= 3) {
    return cleanText;
  }

  // Calculate word frequency
  const words = cleanText.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, ''); // Keep Kannada and English chars
    if (cleanWord.length > 2) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });

  // Score each sentence
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    
    // 1. Word frequency score
    sentenceWords.forEach(word => {
      const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
      score += wordFreq[cleanWord] || 0;
    });
    
    // 2. Position score (first and last sentences are important)
    if (index === 0) score += 5;
    if (index === sentences.length - 1) score += 3;
    if (index < 3) score += 2;
    
    // 3. Length score (prefer moderate length)
    const wordCount = sentenceWords.length;
    if (wordCount >= 8 && wordCount <= 30) score += 3;
    else if (wordCount >= 5 && wordCount <= 40) score += 1;
    
    // 4. Keyword indicators (common in important sentences)
    const keywords = ['ಮುಖ್ಯ', 'ಪ್ರಮುಖ', 'ಮುಖ್ಯವಾಗಿ', 'important', 'main', 'significant', 'however', 'therefore'];
    keywords.forEach(keyword => {
      if (sentence.toLowerCase().includes(keyword)) score += 2;
    });
    
    return { 
      sentence: sentence.trim(), 
      score: score / sentenceWords.length, // Normalize by length
      index,
      length: wordCount
    };
  });

  // Select top sentences (30-40% of original)
  const summaryLength = Math.max(3, Math.ceil(sentences.length * 0.35));
  
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .sort((a, b) => a.index - b.index); // Maintain original order

  const summary = topSentences.map(s => s.sentence).join(' ');
  
  // Ensure summary is not too long
  if (summary.length > 800) {
    return summary.substring(0, 800) + '...';
  }
  
  return summary;
}

// TextRank Algorithm for better summarization
function textRankSummarization(text) {
  const sentences = text.match(/[^।.!?]+[।.!?]+/g) || [text];
  
  if (sentences.length <= 3) {
    return text;
  }

  // Build similarity matrix
  const n = sentences.length;
  const similarity = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    const words1 = new Set(sentences[i].toLowerCase().split(/\s+/).filter(w => w.length > 2));
    for (let j = i + 1; j < n; j++) {
      const words2 = new Set(sentences[j].toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const sim = intersection.size / (words1.size + words2.size - intersection.size + 0.0001);
      similarity[i][j] = sim;
      similarity[j][i] = sim;
    }
  }

  // PageRank algorithm
  const dampingFactor = 0.85;
  const iterations = 50;
  let scores = Array(n).fill(1.0);
  
  for (let iter = 0; iter < iterations; iter++) {
    const newScores = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const sumSim = similarity[j].reduce((a, b) => a + b, 0);
          sum += similarity[j][i] / (sumSim + 0.0001) * scores[j];
        }
      }
      newScores[i] = (1 - dampingFactor) + dampingFactor * sum;
    }
    scores = newScores;
  }

  // Select top sentences
  const summaryLength = Math.max(3, Math.ceil(n * 0.4));
  const ranked = sentences.map((s, i) => ({ sentence: s.trim(), score: scores[i], index: i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .sort((a, b) => a.index - b.index);

  return ranked.map(r => r.sentence).join(' ');
}

// Main summarization function with multiple algorithms
async function summarizeWithModel(text, model) {
  console.log(`Using summarization algorithm: ${model}`);
  
  try {
    let summary;
    
    switch(model) {
      case 'textrank':
        summary = textRankSummarization(text);
        break;
      case 'advanced':
        summary = extractiveSummarization(text, 'advanced');
        break;
      case 'simple':
        summary = extractiveSummarization(text, 'simple');
        break;
      case 'hybrid':
        // Combine both methods
        const tr = textRankSummarization(text);
        const ex = extractiveSummarization(text);
        summary = tr.length < ex.length ? tr : ex;
        break;
      default:
        summary = extractiveSummarization(text);
    }
    
    return summary;
  } catch (error) {
    console.error('Summarization error:', error);
    throw new Error('Summarization failed: ' + error.message);
  }
}

// Routes

// 1. Summarize text input
app.post('/api/summarize/text', async (req, res) => {
  try {
    const { text, model, userId } = req.body;

    if (!text || !model) {
      return res.status(400).json({ error: 'Text and model are required' });
    }

    // Validate Kannada text
    const validation = isKannadaText(text);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.message,
        kannadaPercentage: validation.percentage
      });
    }

    const summarizedText = await summarizeWithModel(text, model);

    const summary = new Summary({
      originalText: text,
      summarizedText,
      model,
      fileType: 'text',
      userId: userId || 'anonymous',
    });

    await summary.save();

    res.json({
      success: true,
      summary: summarizedText,
      id: summary._id,
      kannadaPercentage: validation.percentage
    });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Summarize PDF file
app.post('/api/summarize/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { model, userId } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model selection is required' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'No text found in PDF' });
    }

    // Validate Kannada text in PDF
    const validation = isKannadaText(extractedText);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.message,
        kannadaPercentage: validation.percentage
      });
    }

    const summarizedText = await summarizeWithModel(extractedText, model);

    const summary = new Summary({
      originalText: extractedText,
      summarizedText,
      model,
      fileType: 'pdf',
      userId: userId || 'anonymous',
    });

    await summary.save();

    res.json({
      success: true,
      summary: summarizedText,
      originalText: extractedText,
      id: summary._id,
      kannadaPercentage: validation.percentage
    });
  } catch (error) {
    console.error('PDF summarization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Summarize Word file
app.post('/api/summarize/word', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { model, userId } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model selection is required' });
    }

    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const extractedText = result.value;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'No text found in Word document' });
    }

    // Validate Kannada text in Word document
    const validation = isKannadaText(extractedText);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.message,
        kannadaPercentage: validation.percentage
      });
    }

    const summarizedText = await summarizeWithModel(extractedText, model);

    const summary = new Summary({
      originalText: extractedText,
      summarizedText,
      model,
      fileType: 'word',
      userId: userId || 'anonymous',
    });

    await summary.save();

    res.json({
      success: true,
      summary: summarizedText,
      originalText: extractedText,
      id: summary._id,
      kannadaPercentage: validation.percentage
    });
  } catch (error) {
    console.error('Word summarization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Get summary history
app.get('/api/summaries', async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;
    
    const query = userId && userId !== 'anonymous' ? { userId } : {};
    const summaries = await Summary.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, summaries });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Get summary by ID
app.get('/api/summaries/:id', async (req, res) => {
  try {
    const summary = await Summary.findById(req.params.id);
    
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Delete summary
app.delete('/api/summaries/:id', async (req, res) => {
  try {
    const summary = await Summary.findByIdAndDelete(req.params.id);
    
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ success: true, message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
