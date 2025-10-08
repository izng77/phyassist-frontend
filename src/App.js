import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';

// --- Helper component to safely render LaTeX ---
const KatexComponent = ({ content }) => {
  const containerRef = useRef();

  useEffect(() => {
    if (containerRef.current) {
      let processedContent = content;
      // Replace $$...$$ with display mode KaTeX
      processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        try {
          return katex.renderToString(latex, { displayMode: true, throwOnError: false });
        } catch (e) {
          return match; // Keep original on error
        }
      });
      // Replace $...$ with inline mode KaTeX
      processedContent = processedContent.replace(/\$([\s\S]*?)\$/g, (match, latex) => {
        try {
          return katex.renderToString(latex, { displayMode: false, throwOnError: false });
        } catch (e) {
          return match; // Keep original on error
        }
      });
      containerRef.current.innerHTML = processedContent.replace(/\n/g, '<br />');
    }
  }, [content]);

  return <div ref={containerRef} />;
};


function App() {
  const [question, setQuestion] = useState('');
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState('');

  const handleFileChange = (e) => {
    setFiles(e.target.files);
    setError(null);
    setFeedback('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !question) {
      setError('Please provide a question and upload an image of your solution.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setFeedback('');

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (readEvent) => {
      const base64Image = readEvent.target.result.split(',')[1];
      
      // Get the secure backend URL from Netlify Environment Variables
      const apiUrl = process.env.REACT_APP_CLOUD_RUN_URL;
      
      if (!apiUrl) {
          setError("Configuration error: The API URL is not set. The administrator must configure this in the Netlify dashboard.");
          setIsLoading(false);
          return;
      }

      try {
        const response = await fetch(`${apiUrl}/api/feedback`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            mimeType: file.type,
            question: question,
          }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to get feedback from the server.');
        }

        const data = await response.json();
        setFeedback(data.feedback);

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>PhyAssist</h1>
        <p>Your AI Assistant for H2 Physics</p>
      </header>
      <main style={styles.main}>
        <div style={styles.card}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="question" style={styles.label}>1. Enter the Question</label>
              <input
                type="text"
                id="question"
                style={styles.input}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., 'Calculate the centripetal force...'"
              />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="solution" style={styles.label}>2. Upload Your Handwritten Solution</label>
              <input
                type="file"
                id="solution"
                style={styles.fileInput}
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />
            </div>
            <button type="submit" style={isLoading ? styles.buttonDisabled : styles.button} disabled={isLoading}>
              {isLoading ? 'Analyzing...' : 'Get Feedback'}
            </button>
          </form>
        </div>

        {error && (
          <div style={{...styles.card, backgroundColor: '#ffebee'}}>
            <h3 style={{color: '#c62828'}}>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {feedback && (
          <div style={styles.card}>
            <h3>AI Feedback</h3>
            <div style={styles.feedbackContent}>
                <KatexComponent content={feedback} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Basic Styling
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#f4f7f9',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  main: {
    width: '100%',
    maxWidth: '800px',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '25px',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  fileInput: {
    width: '100%',
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ccc',
    backgroundColor: '#a4b0be',
    border: 'none',
    borderRadius: '4px',
    cursor: 'not-allowed',
  },
  feedbackContent: {
      lineHeight: '1.7',
      color: '#333'
  }
};

export default App;
