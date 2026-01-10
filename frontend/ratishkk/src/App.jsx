import React, { useState } from 'react';
import { FileText, Upload, Download, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function KannadaSummarizer() {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [model, setModel] = useState('textrank');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [error, setError] = useState('');
  const [kannadaPercentage, setKannadaPercentage] = useState(null);

  const validateKannadaText = (inputText) => {
    const kannadaRegex = /[\u0C80-\u0CFF]/g;
    const kannadaMatches = inputText.match(kannadaRegex);
    const cleanText = inputText.replace(/[\s\d\p{P}]/gu, '');
    
    if (!kannadaMatches || cleanText.length === 0) {
      return {
        isValid: false,
        percentage: 0
      };
    }
    
    const percentage = (kannadaMatches.length / cleanText.length) * 100;
    return {
      isValid: percentage >= 70,
      percentage: percentage.toFixed(2)
    };
  };

  const handleTextSummarize = async () => {
    if (!text.trim()) {
      setError('Please enter some text to summarize');
      return;
    }

    const validation = validateKannadaText(text);
    if (!validation.isValid) {
      setError(`Please enter text in Kannada script (ಕನ್ನಡ). Current Kannada content: ${validation.percentage}% (minimum 70% required)`);
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setKannadaPercentage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/summarize/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model,
          userId: 'user_' + Date.now(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
        setOriginalText(text);
        setKannadaPercentage(data.kannadaPercentage);
      } else {
        setError(data.error || 'Summarization failed');
        setKannadaPercentage(data.kannadaPercentage);
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setKannadaPercentage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    formData.append('userId', 'user_' + Date.now());

    const endpoint = activeTab === 'pdf' ? 'pdf' : 'word';

    try {
      const response = await fetch(`${API_BASE_URL}/summarize/${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
        setOriginalText(data.originalText);
        setKannadaPercentage(data.kannadaPercentage);
      } else {
        setError(data.error || 'Summarization failed');
        setKannadaPercentage(data.kannadaPercentage);
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSummary('');
      setKannadaPercentage(null);
    }
  };

  const downloadSummary = () => {
    const content = `ಮೂಲ ಪಠ್ಯ (Original Text):

${originalText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ಸಾರಾಂಶ (Summary):

${summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Algorithm Used: ${model.toUpperCase()}
Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8' });
    
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = `kannada_summary_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const algorithms = [
    { id: 'textrank', name: 'TextRank', icon: '🎯' },
    { id: 'advanced', name: 'Advanced', icon: '⚡' },
    { id: 'hybrid', name: 'Hybrid', icon: '🔄' },
    { id: 'simple', name: 'Simple', icon: '✨' }
  ];

  return (
    <div className="app-container">
      {/* Animated Background */}
      <div className="background-wrapper">
        <div className="background-image"></div>
        <div className="background-overlay"></div>
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
      </div>

      <div className="content-wrapper">
        <div className="main-container">
          {/* Header */}
          <div className="header-section">
            <div className="header-card glass-card">
              <div className="header-content">
                <Sparkles className="header-icon header-icon-left float-animation" size={40} />
                <h1 className="main-title gradient-text">
                  ಕನ್ನಡ ಪಠ್ಯ ಸಾರಾಂಶ
                </h1>
                <Sparkles className="header-icon header-icon-right float-animation" size={40} />
              </div>
              <p className="subtitle">Kannada Text Summarization using NLP</p>
            </div>
          </div>

          {/* Algorithm Selection */}
          <div className="section-card glass-card">
            <h2 className="section-title">Select Algorithm</h2>
            <div className="algorithm-grid">
              {algorithms.map((algo) => (
                <button
                  key={algo.id}
                  onClick={() => setModel(algo.id)}
                  className={`algorithm-card ${model === algo.id ? 'algorithm-card-active' : ''}`}
                >
                  <div className="algorithm-content">
                    <div className="algorithm-icon">{algo.icon}</div>
                    <div className="algorithm-name">{algo.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Selection */}
          <div className="section-card glass-card">
            <h2 className="section-title">Input Method</h2>
            <div className="tab-grid">
              <button
                onClick={() => setActiveTab('text')}
                className={`tab-button ${activeTab === 'text' ? 'tab-button-active' : ''}`}
              >
                <FileText className="tab-icon" size={36} />
                Text Input
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`tab-button ${activeTab === 'pdf' ? 'tab-button-active' : ''}`}
              >
                <Upload className="tab-icon" size={36} />
                PDF File
              </button>
              <button
                onClick={() => setActiveTab('word')}
                className={`tab-button ${activeTab === 'word' ? 'tab-button-active' : ''}`}
              >
                <Upload className="tab-icon" size={36} />
                Word File
              </button>
            </div>

            {/* Input Area */}
            <div className="input-section">
              {activeTab === 'text' && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="ಇಲ್ಲಿ ಕನ್ನಡ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ... (Enter Kannada text here...)"
                  className="text-input kannada-text"
                />
              )}

              {(activeTab === 'pdf' || activeTab === 'word') && (
                <div className="file-upload-zone">
                  <Upload className="upload-icon" size={64} />
                  <input
                    type="file"
                    accept={activeTab === 'pdf' ? '.pdf' : '.doc,.docx'}
                    onChange={handleFileChange}
                    className="file-input"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="file-label">
                    Click to upload {activeTab === 'pdf' ? 'PDF' : 'Word'} file
                  </label>
                  <p className="file-help-text">Maximum file size: 10MB</p>
                  {file && (
                    <div className="file-info">
                      <p className="file-name">📄 {file.name}</p>
                      <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Generate Summary Button */}
          <button
            onClick={activeTab === 'text' ? handleTextSummarize : handleFileUpload}
            disabled={loading || (activeTab === 'text' ? !text.trim() : !file)}
            className="generate-button"
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={32} />
                Processing...
              </>
            ) : (
              <>
                <Sparkles size={32} />
                Generate Summary
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="alert-error">
              <div className="alert-content">
                <AlertCircle className="alert-icon" size={32} />
                <div>
                  <h3 className="alert-title">Error</h3>
                  <p className="alert-message">{error}</p>
                  {kannadaPercentage !== null && (
                    <p className="alert-info">
                      Detected Kannada content: {kannadaPercentage}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Result */}
          {summary && (
            <div className="summary-box">
              <div className="summary-header">
                <div>
                  <h3 className="summary-title">
                    <span className="summary-emoji">✨</span>
                    Summarized Text
                  </h3>
                  {kannadaPercentage && (
                    <p className="summary-percentage">
                      Kannada content: {kannadaPercentage}%
                    </p>
                  )}
                </div>
                <button onClick={downloadSummary} className="download-btn">
                  <Download size={24} />
                  Download
                </button>
              </div>
              <div className="summary-content">
                <p className="summary-text kannada-text">{summary}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}