/**
 * Notion Service
 * Integrates with Notion API to maintain a secondary dashboard.
 */

const NOTION_API_URL = 'https://api.notion.com/v1';

export interface NotionCredentials {
  notionToken: string;
  notionDatabaseId: string;
}

// Helper to get headers
function getHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };
}

// Convert local date and time to ISO8601 string for Notion
function formatDeadline(date: string, time: string): string {
  try {
    if (date && time) {
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

  if (done) {
    props["Status"] = {
      "status": {
        "name": "Done"
      }
    };
  }

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

export async function createNotionTask(reminder: any, creds?: NotionCredentials | null): Promise<string | null> {
  if (!creds?.notionToken || !creds?.notionDatabaseId) {
    return null;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: getHeaders(creds.notionToken),
      body: JSON.stringify({
        parent: { database_id: creds.notionDatabaseId },
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
    return null; 
  }
}

export async function updateNotionTask(reminder: any, creds?: NotionCredentials | null): Promise<boolean> {
  if (!creds?.notionToken || !reminder.notion_page_id) {
    return false;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${reminder.notion_page_id}`, {
      method: 'PATCH',
      headers: getHeaders(creds.notionToken),
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

export async function archiveNotionTask(notionPageId: string, creds?: NotionCredentials | null): Promise<boolean> {
  if (!creds?.notionToken || !notionPageId) {
    return false;
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: getHeaders(creds.notionToken),
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

// Update ONLY the Status property on a Notion page
export async function updateNotionStatus(notionPageId: string, statusName: string, creds?: NotionCredentials | null): Promise<{ success: boolean, error?: string }> {
  if (!creds?.notionToken || !notionPageId) {
    return { success: false, error: 'Missing token or notion_page_id' };
  }

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: getHeaders(creds.notionToken),
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
      return { success: false, error: `${response.status} ${errorText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating Notion status:', error);
    return { success: false, error: error.message };
  }
}
