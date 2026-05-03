/**
 * Notion Service
 * Integrates with Notion API to maintain a secondary dashboard.
 */

const NOTION_API_URL = 'https://api.notion.com/v1';

// Helper to get headers
function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };
}

// Convert local date and time to ISO8601 string for Notion
function formatDeadline(date: string, time: string): string {
  try {
    if (date && time) {
      // Create a datetime string. Assuming +04:00 timezone as seen in check-reminders.ts
      return `${date}T${time}:00.000+04:00`;
    }
    return new Date().toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}

// Convert priority to match Notion emojis
function formatPriority(priority: string): string {
  switch (priority?.toUpperCase()) {
    case 'HIGH': return 'High 🔥';
    case 'LOW': return 'Low 🧊';
    case 'MEDIUM':
    default:
      return 'Medium ⏳';
  }
}

// Create properties object mapping our data to Notion columns
function buildProperties(reminder: any) {
  const { text, date, time, done, user_id, priority, category, assigned_to } = reminder;

  const props: any = {
    "Task Name": {
      "title": [
        {
          "text": {
            "content": text || "Untitled Task"
          }
        }
      ]
    },
    "Due Date": {
      "date": {
        "start": formatDeadline(date, time)
      }
    },
    "Priority": {
      "select": {
        "name": formatPriority(priority)
      }
    },
    "Notes & Details": {
      "rich_text": [
        {
          "text": {
            "content": `Telegram ID: ${user_id || 'Unknown'}`
          }
        }
      ]
    }
  };

  // Only send Status if the task is done to avoid "Not started" naming conflicts.
  if (done) {
    props["Status"] = {
      "status": {
        "name": "Done"
      }
    };
  }

  // Optional fields
  if (category) {
    props["Category"] = {
      "select": {
        "name": category
      }
    };
  }

  if (assigned_to) {
    props["Assigned To"] = {
      "select": {
        "name": assigned_to
      }
    };
  }

  return props;
}

export async function createNotionTask(reminder: any): Promise<string | null> {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.warn('Notion credentials missing. Skipping creation.');
    return null;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: buildProperties(reminder)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API Error (Create): ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json() as any;
    return data.id; // Return the notion_page_id
  } catch (error) {
    console.error('Error creating Notion task:', error);
    return null; // Fail gracefully
  }
}

export async function updateNotionTask(reminder: any): Promise<boolean> {
  if (!process.env.NOTION_TOKEN || !reminder.notion_page_id) {
    return false;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${reminder.notion_page_id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        properties: buildProperties(reminder)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API Error (Update): ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating Notion task:', error);
    return false;
  }
}

export async function archiveNotionTask(notionPageId: string): Promise<boolean> {
  if (!process.env.NOTION_TOKEN || !notionPageId) {
    return false;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        archived: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API Error (Archive): ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error archiving Notion task:', error);
    return false;
  }
}

// Update ONLY the Status property on a Notion page (used for In Progress / Done transitions)
export async function updateNotionStatus(notionPageId: string, statusName: string): Promise<boolean> {
  if (!process.env.NOTION_TOKEN || !notionPageId) {
    return false;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        properties: {
          "Status": {
            "status": {
              "name": statusName
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API Error (Status Update): ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating Notion status:', error);
    return false;
  }
}

