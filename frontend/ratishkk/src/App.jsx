import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

// Simple icon components as fallback
const FileText = () => <span>📝</span>;
const Upload = ({ size }) => <span style={{ fontSize: size ? `${size}px` : '20px' }}>📤</span>;
const History = () => <span>📜</span>;
const Trash2 = ({ size }) => <span style={{ fontSize: size ? `${size}px` : '16px' }}>🗑️</span>;
const Download = ({ size }) => <span style={{ fontSize: size ? `${size}px` : '16px' }}>⬇️</span>;
const Loader = ({ className, size }) => (
  <span className={className} style={{ fontSize: size ? `${size}px` : '20px' }}>⏳</span>
);

export default function KannadaSummarizer() {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [model, setModel] = useState('textrank');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/summaries?limit=20`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.summaries);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleTextSummarize = async () => {
    if (!text.trim()) {
      setError('Please enter some text to summarize');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');

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
        fetchHistory();
      } else {
        setError(data.error || 'Summarization failed');
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
        fetchHistory();
      } else {
        setError(data.error || 'Summarization failed');
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
    }
  };

  const deleteHistory = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/summaries/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Error deleting summary:', err);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">
            ಕನ್ನಡ ಪಠ್ಯ ಸಾರಾಂಶ
          </h1>
          <p className="text-gray-600">Kannada Text Summarization using NLP</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Summarization Algorithm:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center cursor-pointer p-3 border rounded hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    value="textrank"
                    checked={model === 'textrank'}
                    onChange={(e) => setModel(e.target.value)}
                    className="mr-2"
                  />
                  <div>
                    <div className="text-sm font-medium">TextRank</div>
                    <div className="text-xs text-gray-500">Graph-based (Best)</div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer p-3 border rounded hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    value="advanced"
                    checked={model === 'advanced'}
                    onChange={(e) => setModel(e.target.value)}
                    className="mr-2"
                  />
                  <div>
                    <div className="text-sm font-medium">Advanced</div>
                    <div className="text-xs text-gray-500">Frequency-based</div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer p-3 border rounded hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    value="hybrid"
                    checked={model === 'hybrid'}
                    onChange={(e) => setModel(e.target.value)}
                    className="mr-2"
                  />
                  <div>
                    <div className="text-sm font-medium">Hybrid</div>
                    <div className="text-xs text-gray-500">Combined approach</div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer p-3 border rounded hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    value="simple"
                    checked={model === 'simple'}
                    onChange={(e) => setModel(e.target.value)}
                    className="mr-2"
                  />
                  <div>
                    <div className="text-sm font-medium">Simple</div>
                    <div className="text-xs text-gray-500">Fast & reliable</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b mb-6">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'text'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText size={20} />
                Text Input
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'pdf'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload size={20} />
                Upload PDF
              </button>
              <button
                onClick={() => setActiveTab('word')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'word'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload size={20} />
                Upload Word
              </button>
            </div>

            {/* Text Input Tab */}
            {activeTab === 'text' && (
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="ಇಲ್ಲಿ ಕನ್ನಡ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ... (Enter Kannada text here...)"
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <button
                  onClick={handleTextSummarize}
                  disabled={loading || !text.trim()}
                  className="mt-4 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Summarizing...
                    </>
                  ) : (
                    'Generate Summary'
                  )}
                </button>
              </div>
            )}

            {/* PDF Upload Tab */}
            {activeTab === 'pdf' && (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer text-orange-500 hover:text-orange-600 font-semibold"
                  >
                    Click to upload PDF
                  </label>
                  {file && (
                    <p className="mt-4 text-sm text-gray-600">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleFileUpload}
                  disabled={loading || !file}
                  className="mt-4 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    'Summarize PDF'
                  )}
                </button>
              </div>
            )}

            {/* Word Upload Tab */}
            {activeTab === 'word' && (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <input
                    type="file"
                    accept=".doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="word-upload"
                  />
                  <label
                    htmlFor="word-upload"
                    className="cursor-pointer text-orange-500 hover:text-orange-600 font-semibold"
                  >
                    Click to upload Word document
                  </label>
                  {file && (
                    <p className="mt-4 text-sm text-gray-600">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleFileUpload}
                  disabled={loading || !file}
                  className="mt-4 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    'Summarize Word Document'
                  )}
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Summary Result */}
            {summary && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-green-800">Summary:</h3>
                  <button
                    onClick={downloadSummary}
                    className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </div>

          {/* History Sidebar */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-orange-500" size={24} />
              <h2 className="text-xl font-bold text-gray-800">History</h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No summaries yet
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteHistory(item._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      Model: <span className="font-semibold">{item.model}</span>
                    </p>
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {item.summarizedText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-gray-800 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
            <li>Select your preferred NLP model (IndicBART or mT5)</li>
            <li>Choose input method: Text, PDF, or Word document</li>
            <li>Enter Kannada text or upload your document</li>
            <li>Click the summarize button to generate summary</li>
            <li>View and download your summary</li>
            <li>Check history sidebar for previous summaries</li>
          </ol>
        </div>
      </div>
    </div>
  );
}