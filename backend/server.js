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
  const kannadaRegex = /[\u0C80-\u0CFF]/g;
  const kannadaMatches = text.match(kannadaRegex);
  const cleanText = text.replace(/[\s\d\p{P}]/gu, '');
  
  if (!kannadaMatches || cleanText.length === 0) {
    return {
      isValid: false,
      percentage: 0,
      message: 'No Kannada text detected. Please provide text in Kannada script (ಕನ್ನಡ).'
    };
  }
  
  const kannadaPercentage = (kannadaMatches.length / cleanText.length) * 100;
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

// SIMPLE ALGORITHM - Basic frequency-based extraction (shortest summary)
function simpleSummarization(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const sentences = cleanText.match(/[^।.!?]+[।.!?]+/g) || [cleanText];
  
  if (sentences.length <= 2) {
    return cleanText;
  }

  // Very simple: just word frequency, prefer shorter sentences
  const words = cleanText.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
    if (cleanWord.length > 2) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });

  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    
    // Only word frequency
    sentenceWords.forEach(word => {
      const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
      score += wordFreq[cleanWord] || 0;
    });
    
    // First sentence bonus
    if (index === 0) score += 3;
    
    return { 
      sentence: sentence.trim(), 
      score: score / sentenceWords.length,
      index,
      length: sentenceWords.length
    };
  });

  // Select fewer sentences (25% of original)
  const summaryLength = Math.max(2, Math.ceil(sentences.length * 0.25));
  
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.sentence).join(' ');
}

// ADVANCED ALGORITHM - Position, length, keywords (medium summary)
function advancedSummarization(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const sentences = cleanText.match(/[^।.!?]+[।.!?]+/g) || [cleanText];
  
  if (sentences.length <= 3) {
    return cleanText;
  }

  const words = cleanText.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
    if (cleanWord.length > 2) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });

  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    
    // 1. Word frequency score
    sentenceWords.forEach(word => {
      const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
      score += wordFreq[cleanWord] || 0;
    });
    
    // 2. Enhanced position score
    if (index === 0) score += 8;
    if (index === sentences.length - 1) score += 5;
    if (index < 3) score += 3;
    
    // 3. Length score (prefer moderate length)
    const wordCount = sentenceWords.length;
    if (wordCount >= 8 && wordCount <= 30) score += 5;
    else if (wordCount >= 5 && wordCount <= 40) score += 2;
    
    // 4. Keyword indicators
    const keywords = ['ಮುಖ್ಯ', 'ಪ್ರಮುಖ', 'ಮುಖ್ಯವಾಗಿ', 'ಆದರೆ', 'ಹೀಗಾಗಿ', 'important', 'main', 'significant', 'however', 'therefore'];
    keywords.forEach(keyword => {
      if (sentence.toLowerCase().includes(keyword)) score += 4;
    });
    
    // 5. Numerical data bonus
    if (/\d+/.test(sentence)) score += 2;
    
    return { 
      sentence: sentence.trim(), 
      score: score / sentenceWords.length,
      index,
      length: wordCount
    };
  });

  // Select 35% of original sentences
  const summaryLength = Math.max(3, Math.ceil(sentences.length * 0.35));
  
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.sentence).join(' ');
}

// TEXTRANK ALGORITHM - Graph-based (longer, comprehensive summary)
function textRankSummarization(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const sentences = cleanText.match(/[^।.!?]+[।.!?]+/g) || [cleanText];
  
  if (sentences.length <= 3) {
    return text;
  }

  const n = sentences.length;
  const similarity = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Build similarity matrix based on word overlap
  for (let i = 0; i < n; i++) {
    const words1 = new Set(
      sentences[i].toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^\w\u0C80-\u0CFF]/g, ''))
        .filter(w => w.length > 2)
    );
    
    for (let j = i + 1; j < n; j++) {
      const words2 = new Set(
        sentences[j].toLowerCase()
          .split(/\s+/)
          .map(w => w.replace(/[^\w\u0C80-\u0CFF]/g, ''))
          .filter(w => w.length > 2)
      );
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      const sim = intersection.size / (union.size + 0.0001);
      
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
          if (sumSim > 0) {
            sum += (similarity[j][i] / sumSim) * scores[j];
          }
        }
      }
      newScores[i] = (1 - dampingFactor) + dampingFactor * sum;
    }
    scores = newScores;
  }

  // Select 45% of sentences (longest summary)
  const summaryLength = Math.max(3, Math.ceil(n * 0.45));
  const ranked = sentences.map((s, i) => ({ 
    sentence: s.trim(), 
    score: scores[i], 
    index: i 
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .sort((a, b) => a.index - b.index);

  return ranked.map(r => r.sentence).join(' ');
}

// HYBRID ALGORITHM - Combines TextRank with frequency analysis
function hybridSummarization(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const sentences = cleanText.match(/[^।.!?]+[।.!?]+/g) || [cleanText];
  
  if (sentences.length <= 3) {
    return text;
  }

  // Get TextRank scores
  const n = sentences.length;
  const similarity = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    const words1 = new Set(
      sentences[i].toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^\w\u0C80-\u0CFF]/g, ''))
        .filter(w => w.length > 2)
    );
    
    for (let j = i + 1; j < n; j++) {
      const words2 = new Set(
        sentences[j].toLowerCase()
          .split(/\s+/)
          .map(w => w.replace(/[^\w\u0C80-\u0CFF]/g, ''))
          .filter(w => w.length > 2)
      );
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      const sim = intersection.size / (union.size + 0.0001);
      
      similarity[i][j] = sim;
      similarity[j][i] = sim;
    }
  }

  const dampingFactor = 0.85;
  const iterations = 30;
  let textRankScores = Array(n).fill(1.0);
  
  for (let iter = 0; iter < iterations; iter++) {
    const newScores = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const sumSim = similarity[j].reduce((a, b) => a + b, 0);
          if (sumSim > 0) {
            sum += (similarity[j][i] / sumSim) * textRankScores[j];
          }
        }
      }
      newScores[i] = (1 - dampingFactor) + dampingFactor * sum;
    }
    textRankScores = newScores;
  }

  // Get frequency scores
  const words = cleanText.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
    if (cleanWord.length > 2) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });

  const scoredSentences = sentences.map((sentence, index) => {
    let freqScore = 0;
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    
    sentenceWords.forEach(word => {
      const cleanWord = word.replace(/[^\w\u0C80-\u0CFF]/g, '');
      freqScore += wordFreq[cleanWord] || 0;
    });
    
    freqScore = freqScore / sentenceWords.length;
    
    // Combine TextRank and frequency scores (weighted average)
    const combinedScore = (textRankScores[index] * 0.6) + (freqScore * 0.4);
    
    // Position bonus
    let positionBonus = 0;
    if (index === 0) positionBonus = 0.3;
    else if (index === n - 1) positionBonus = 0.15;
    else if (index < 3) positionBonus = 0.1;
    
    return { 
      sentence: sentence.trim(), 
      score: combinedScore + positionBonus,
      index
    };
  });

  // Select 40% of sentences
  const summaryLength = Math.max(3, Math.ceil(n * 0.40));
  
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.sentence).join(' ');
}

// Main summarization function
async function summarizeWithModel(text, model) {
  console.log(`Using summarization algorithm: ${model}`);
  
  try {
    let summary;
    
    switch(model) {
      case 'textrank':
        summary = textRankSummarization(text);
        console.log('TextRank: Comprehensive graph-based summary (45% of original)');
        break;
      case 'advanced':
        summary = advancedSummarization(text);
        console.log('Advanced: Balanced summary with position & keywords (35% of original)');
        break;
      case 'simple':
        summary = simpleSummarization(text);
        console.log('Simple: Concise frequency-based summary (25% of original)');
        break;
      case 'hybrid':
        summary = hybridSummarization(text);
        console.log('Hybrid: Combined TextRank + Frequency (40% of original)');
        break;
      default:
        summary = advancedSummarization(text);
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