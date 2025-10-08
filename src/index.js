const express = require('express');
const cors = require('cors'); // Require the cors package
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' })); // Allow large image payloads

// --- THE FIX IS HERE ---
// We are explicitly telling the server to allow requests
// from your live Netlify website.
const corsOptions = {
  origin: 'https://phyassist.netlify.app',
  optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));
// --- END OF FIX ---

// Get API key from environment variable or pasted key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "PASTE_YOUR_GEMINI_API_KEY_FROM_YOUR_TEXT_FILE_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// Helper function to convert file data to a GenAI part
function fileToGenerativePart(base64, mimeType) {
  return {
    inlineData: {
      data: base64,
      mimeType
    },
  };
}

// Main feedback route
app.post('/api/feedback', async (req, res) => {
  try {
    const { image, mimeType, question } = req.body;

    if (!image || !mimeType || !question) {
      return res.status(400).json({ error: "Missing image, mimeType, or question in request." });
    }

    const imagePart = fileToGenerativePart(image, mimeType);

    const prompt = `
      You are PhyAssist, an expert AI tutor for the Singapore A-Level H2 Physics (9749) syllabus. 
      Your role is to provide formative assessment feedback to a student who has submitted a photo of their handwritten work.
      DO NOT give the final answer. Your goal is to guide the student to discover the answer themselves.

      Here is the question the student was trying to solve: "${question}"

      Analyze the provided image of the student's solution. Your task is to:
      1.  Identify the student's method and any correct steps they have taken. Praise them for their correct work.
      2.  Pinpoint the specific location of the first conceptual error or calculation mistake.
      3.  Provide a clear, concise explanation of WHY it is a mistake. Refer to specific Physics principles.
      4.  Provide a scaffolded hint or a guiding question to help the student correct their mistake and figure out the next step.
      5.  Format all mathematical equations, symbols, and units using standard LaTeX. Use $...$ for inline math and $$...$$ for display math. Do not use markdown code blocks for equations.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const feedbackText = response.text();

    res.status(200).json({ feedback: feedbackText });

  } catch (error) {
    console.error("Error generating feedback:", error);
    res.status(500).json({ error: "An internal error occurred while analyzing the solution." });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`PhyAssist AI server listening on port ${PORT}`);
});

