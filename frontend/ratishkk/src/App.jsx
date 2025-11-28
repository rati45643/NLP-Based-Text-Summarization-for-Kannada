import React, { useState } from 'react';
import { FileText, Upload, Download, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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

  // Kannada validation function (client-side)
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

    // Client-side validation
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
    const element = document.createElement('a');
    const file = new Blob([`Original Text:\n\n${originalText}\n\n---\n\nSummary:\n\n${summary}`], {
      type: 'text/plain',
    });
    element.href = URL.createObjectURL(file);
    element.download = `summary_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const modelDescriptions = {
    textrank: {
      name: 'TextRank',
      desc: 'Graph-based algorithm',
      detail: 'Uses PageRank to identify important sentences',
      icon: '🎯'
    },
    advanced: {
      name: 'Advanced',
      desc: 'Frequency-based method',
      detail: 'Scores sentences using word frequency and position',
      icon: '⚡'
    },
    hybrid: {
      name: 'Hybrid',
      desc: 'Combined approach',
      detail: 'Merges TextRank and Advanced methods',
      icon: '🔄'
    },
    simple: {
      name: 'Simple',
      desc: 'Fast & reliable',
      detail: 'Quick extractive summarization',
      icon: '✨'
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Background with Image */}
      <div className="fixed inset-0">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80")`,
          }}
        ></div>
        
        {/* Gradient Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-amber-900/30 to-yellow-900/40"></div>
        
        {/* Animated Light Overlays */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-amber-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
        
        {/* Decorative Pattern Overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-block">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl px-8 py-6 border-2 border-white/50 hover:shadow-orange-300/50 hover:shadow-3xl transition-all duration-300">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Sparkles className="text-orange-500 animate-pulse" size={32} />
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
                    ಕನ್ನಡ ಪಠ್ಯ ಸಾರಾಂಶ
                  </h1>
                  <Sparkles className="text-orange-500 animate-pulse" size={32} style={{animationDelay: '1s'}} />
                </div>
                <p className="text-gray-700 text-lg font-semibold">Kannada Text Summarization using NLP</p>
              </div>
            </div>
          </div>

          {/* Language Warning Banner */}
          <div className="mb-6 bg-gradient-to-r from-blue-100/95 to-indigo-100/95 backdrop-blur-xl border-2 border-blue-300 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">ಕನ್ನಡ ಮಾತ್ರ (Kannada Only)</h3>
                <p className="text-blue-800 text-sm">
                  This application only accepts text in Kannada script. Please ensure your input contains at least 70% Kannada characters. 
                  Other languages or scripts will be rejected.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Model Selection Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border-2 border-white/50 sticky top-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  Select Algorithm
                </h3>
                <div className="space-y-3">
                  {Object.entries(modelDescriptions).map(([key, info]) => (
                    <label
                      key={key}
                      className={`flex flex-col cursor-pointer p-4 rounded-xl transition-all duration-200 ${
                        model === key
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg scale-105'
                          : 'bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          value={key}
                          checked={model === key}
                          onChange={(e) => setModel(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{info.icon}</span>
                            <span className="font-bold text-lg">{info.name}</span>
                          </div>
                          <div className={`text-sm ${model === key ? 'text-white/90' : 'text-gray-600'} mb-1`}>
                            {info.desc}
                          </div>
                          <div className={`text-xs ${model === key ? 'text-white/75' : 'text-gray-500'}`}>
                            {info.detail}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Algorithm Info */}
                <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <span>💡</span> How it works
                  </h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {model === 'textrank' && 'Uses graph theory to rank sentences based on their importance and similarity to other sentences.'}
                    {model === 'advanced' && 'Analyzes word frequency, sentence position, and keyword presence to score each sentence.'}
                    {model === 'hybrid' && 'Combines multiple algorithms to produce the most accurate summary possible.'}
                    {model === 'simple' && 'Quickly extracts key sentences using basic frequency analysis.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div className="lg:col-span-2">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border-2 border-white/50 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b-2 border-orange-200 bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-sm">
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-all ${
                      activeTab === 'text'
                        ? 'bg-white text-orange-600 border-b-4 border-orange-500 shadow-lg'
                        : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
                    }`}
                  >
                    <FileText size={20} />
                    Text Input
                  </button>
                  <button
                    onClick={() => setActiveTab('pdf')}
                    className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-all ${
                      activeTab === 'pdf'
                        ? 'bg-white text-orange-600 border-b-4 border-orange-500 shadow-lg'
                        : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
                    }`}
                  >
                    <Upload size={20} />
                    PDF
                  </button>
                  <button
                    onClick={() => setActiveTab('word')}
                    className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-all ${
                      activeTab === 'word'
                        ? 'bg-white text-orange-600 border-b-4 border-orange-500 shadow-lg'
                        : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
                    }`}
                  >
                    <Upload size={20} />
                    Word
                  </button>
                </div>

                <div className="p-6">
                  {/* Text Input Tab */}
                  {activeTab === 'text' && (
                    <div>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="ಇಲ್ಲಿ ಕನ್ನಡ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ... (Enter Kannada text here...)"
                        className="w-full h-80 p-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 resize-none transition-all shadow-sm font-mono bg-white"
                      />
                      <button
                        onClick={handleTextSummarize}
                        disabled={loading || !text.trim()}
                        className="mt-4 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={24} />
                            <span className="text-lg">Summarizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={24} />
                            <span className="text-lg">Generate Summary</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* PDF Upload Tab */}
                  {activeTab === 'pdf' && (
                    <div>
                      <div className="border-2 border-dashed border-orange-300 rounded-xl p-16 text-center bg-gradient-to-br from-orange-50/50 to-amber-50/50 hover:border-orange-400 transition-all">
                        <Upload className="mx-auto mb-4 text-orange-400" size={56} />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          id="pdf-upload"
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="cursor-pointer text-orange-600 hover:text-orange-700 font-bold text-lg"
                        >
                          Click to upload Kannada PDF
                        </label>
                        <p className="text-gray-500 mt-2">or drag and drop</p>
                        {file && (
                          <div className="mt-6 p-4 bg-white rounded-lg shadow-md inline-block">
                            <p className="text-sm font-semibold text-gray-700">
                              📄 {file.name}
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleFileUpload}
                        disabled={loading || !file}
                        className="mt-4 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={24} />
                            <span className="text-lg">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={24} />
                            <span className="text-lg">Summarize PDF</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Word Upload Tab */}
                  {activeTab === 'word' && (
                    <div>
                      <div className="border-2 border-dashed border-orange-300 rounded-xl p-16 text-center bg-gradient-to-br from-orange-50/50 to-amber-50/50 hover:border-orange-400 transition-all">
                        <Upload className="mx-auto mb-4 text-orange-400" size={56} />
                        <input
                          type="file"
                          accept=".doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          id="word-upload"
                        />
                        <label
                          htmlFor="word-upload"
                          className="cursor-pointer text-orange-600 hover:text-orange-700 font-bold text-lg"
                        >
                          Click to upload Kannada Word document
                        </label>
                        <p className="text-gray-500 mt-2">or drag and drop</p>
                        {file && (
                          <div className="mt-6 p-4 bg-white rounded-lg shadow-md inline-block">
                            <p className="text-sm font-semibold text-gray-700">
                              📝 {file.name}
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleFileUpload}
                        disabled={loading || !file}
                        className="mt-4 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-3"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={24} />
                            <span className="text-lg">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={24} />
                            <span className="text-lg">Summarize Word Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="mt-6 bg-red-50/95 backdrop-blur-sm border-2 border-red-300 text-red-700 px-6 py-4 rounded-xl shadow-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="flex-shrink-0 mt-1" size={24} />
                        <div>
                          <p className="font-semibold mb-1">Error</p>
                          <p className="text-sm">{error}</p>
                          {kannadaPercentage !== null && (
                            <p className="text-xs mt-2 text-red-600">
                              Detected Kannada content: {kannadaPercentage}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Result */}
                  {summary && (
                    <div className="mt-6 bg-gradient-to-br from-green-50/95 to-emerald-50/95 backdrop-blur-xl border-2 border-green-300 rounded-xl shadow-xl overflow-hidden animate-fade-in">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <span className="text-2xl">✨</span>
                            Summary Generated
                          </h3>
                          {kannadaPercentage && (
                            <p className="text-white/90 text-sm mt-1">
                              Kannada content: {kannadaPercentage}%
                            </p>
                          )}
                        </div>
                        <button
                          onClick={downloadSummary}
                          className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-md hover:shadow-lg"
                        >
                          <Download size={18} />
                          Download
                        </button>
                      </div>
                      <div className="p-6">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">{summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border-2 border-white/50">
                <h3 className="font-bold text-gray-800 mb-4 text-xl flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  How to Use
                </h3>
                <div className="space-y-3">
                  {[
                    'Select your preferred NLP algorithm from the sidebar',
                    'Choose input method: Text, PDF, or Word document',
                    'Enter Kannada text (ಕನ್ನಡ) or upload document with Kannada content',
                    'Ensure at least 70% of content is in Kannada script',
                    'Click the summarize button to generate summary',
                    'View and download your summary'
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 pt-0.5">{step}</span>
                    </div>
                  ))}
                  

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
}