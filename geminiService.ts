import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, Subtask, Priority, Status } from "../types";

// Initialize Gemini Client
// Note: In a real production app, this key should be proxied via backend.
// Here we follow the instruction to use process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSubtasks = async (task: Task, context: string): Promise<Partial<Subtask>[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key provided for Gemini.");
    return [];
  }

  const model = "gemini-2.5-flash";
  
  const prompt = `
    I am a consultant working on a project.
    Task: "${task.title}"
    Category: "${task.category}"
    Project: "${task.projectName}"
    Context/Notes: "${context || task.notes}"
    
    Please break this task down into 3-6 actionable subtasks with estimated hours.
    Prioritize them logically.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Actionable subtask title" },
        estimatedHours: { type: Type.NUMBER, description: "Estimated hours to complete" },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
      },
      required: ["title", "estimatedHours", "priority"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3, 
      }
    });

    const rawJson = response.text;
    if (!rawJson) return [];

    const parsed = JSON.parse(rawJson);
    
    // Map to our Subtask interface type partially
    return parsed.map((item: any) => ({
      title: item.title,
      estimatedHours: item.estimatedHours,
      priority: item.priority as Priority,
      status: Status.NOT_STARTED,
      percentComplete: 0,
      assignedTo: "Me"
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export const generateBillingSummary = async (taskName: string, logs: {date: string, hours: number, notes: string}[]) => {
  if (!process.env.API_KEY) return "API Key missing.";

  const model = "gemini-2.5-flash";
  const prompt = `
    Create a professional invoice description line item summary for the following work logs.
    Task Name: ${taskName}
    Logs: ${JSON.stringify(logs)}
    
    Summarize the work completed in 2-3 sentences suitable for a client invoice.
    Do not include prices, just the description of work.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error(error);
    return "Error generating summary.";
  }
}