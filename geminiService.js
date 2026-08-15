import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Explicitly pass the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Helper: strip accidental markdown code fences ────────────────────────────
function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/**
 * Parses a resume text to extract skills, experience, and target job.
 * @param {string} resumeText
 * @returns {Promise<{ skills: string[], experience: number, targetJob: string }>}
 */
export async function parseResume(resumeText) {
  const prompt = `You are a resume parser. Extract the following information from the given resume text and return it ONLY as a JSON object with no extra text:
{
  "skills": ["array of skills"],
  "experience": <number of years experience>,
  "targetJob": "the job title they are targeting"
}
Resume text:
${resumeText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const raw = stripFences(response.text ?? '');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned unparseable JSON for resume: ${raw.slice(0, 200)}`);
  }
}

/**
 * Evaluates mentor-student compatibility based on skills (single-mentor version).
 * @param {string[]} studentSkills
 * @param {string[]} mentorSkills
 * @param {string} studentTarget
 * @param {string} mentorSpecialty
 * @returns {Promise<{ score: number, reason: string }>}
 */
export async function evaluateCompatibility(studentSkills, mentorSkills, studentTarget, mentorSpecialty) {
  const prompt = `You are a career mentor matching expert. Evaluate the compatibility between a student and a mentor on a scale of 0-100.
Return ONLY a JSON object with this structure:
{ "score": number, "reason": "brief explanation of the score" }

Student data:
- Skills: ${studentSkills.join(', ')}
- Target job: ${studentTarget}

Mentor data:
- Skills: ${mentorSkills.join(', ')}
- Specialty: ${mentorSpecialty}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const raw = stripFences(response.text ?? '');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned unparseable JSON for compatibility: ${raw.slice(0, 200)}`);
  }
}

export default ai;
