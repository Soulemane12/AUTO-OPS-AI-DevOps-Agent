import axios from "axios";
import type { Incident } from "./agent";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

export async function askClaudeForPlan(incident: Incident): Promise<string> {
  if (!CLAUDE_API_KEY) {
    console.warn("Claude API key not found, returning mock plan");
    return `Mock plan for ${incident.error_type}: Add error handling and validation`;
  }

  try {
    const prompt = `
You are an expert Python developer. Analyze this error and provide a concise fix plan.

Error Details:
- File: ${incident.filename}
- Line: ${incident.line || "unknown"}
- Error Type: ${incident.error_type}
- Message: ${incident.message}

Code:
\`\`\`python
${incident.code}
\`\`\`

Traceback:
\`\`\`
${incident.traceback}
\`\`\`

Provide a brief 2-3 sentence plan to fix this error. Focus on the specific issue and solution.
`;

    const payload = {
      model: "claude-3-sonnet-20240229",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    const response = await axios.post(CLAUDE_API_URL, payload, {
      headers: {
        "Authorization": `Bearer ${CLAUDE_API_KEY}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      timeout: 15000, // 15 seconds
    });

    const plan = response.data.content[0].text;
    console.log(`Claude plan received for incident ${incident.id}`);
    return plan;
  } catch (error) {
    console.error(`Error getting plan from Claude:`, error);
    // Return a fallback plan instead of throwing
    return `Fallback plan for ${incident.error_type}: Review the error traceback and add appropriate error handling`;
  }
}

// New AUTO-OPS function to get safe patches as unified diffs
export async function getAutoOpsPatch(incident: Incident): Promise<string> {
  if (!CLAUDE_API_KEY) {
    console.warn("Claude API key not found, returning mock patch");
    return `--- ${incident.filename}
+++ ${incident.filename}
@@ -1,5 +1,8 @@
 def checkout(order):
-    return order["customer"]["id"]  # will error if keys missing
+    if "customer" not in order:
+        raise ValueError("Missing customer information")
+    if "id" not in order["customer"]:
+        raise ValueError("Missing customer ID")
+    return order["customer"]["id"]

 if __name__ == "__main__":
     data = {}  # guaranteed KeyError`;
  }

  try {
    const systemPrompt = "You are AUTO-OPS, a safe DevOps engineer. Given a Python error (traceback + code), propose a minimal safe patch as a unified diff. Don't do anything destructive.";

    const userMessage = `Error Type: ${incident.error_type}
Message: ${incident.message}

Traceback:
${incident.traceback}

Code (${incident.filename}):
${incident.code}

Please provide a minimal safe patch as a unified diff format to fix this error. Focus only on the specific issue and add proper error handling.`;

    const payload = {
      model: "claude-3-sonnet-20240229",
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ]
    };

    const response = await axios.post(CLAUDE_API_URL, payload, {
      headers: {
        "Authorization": `Bearer ${CLAUDE_API_KEY}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      timeout: 15000, // 15 seconds
    });

    const patch = response.data.content[0].text;
    console.log(`AUTO-OPS patch received for incident ${incident.id}`);
    return patch;
  } catch (error) {
    console.error(`Error getting AUTO-OPS patch from Claude:`, error);
    // Return a fallback patch instead of throwing
    return `--- ${incident.filename}
+++ ${incident.filename}
@@ -1,2 +1,5 @@
 def checkout(order):
-    return order["customer"]["id"]
+    if not order or "customer" not in order:
+        raise ValueError("Invalid order: missing customer")
+    return order["customer"]["id"]`;
  }
}