const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const dataDir = path.join(__dirname, 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const tasksFile = path.join(dataDir, 'tasks.json');
const campaignsFile = path.join(dataDir, 'campaigns.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const readJSON = (filePath, defaultData = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultData;
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
};

app.get('/api/projects', (req, res) => {
  const projects = readJSON(projectsFile, []);
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const projects = readJSON(projectsFile, []);
  const newProject = {
    id: Date.now(),
    name: req.body.name,
    description: req.body.description,
    status: req.body.status || 'in-progress',
    completion: req.body.completion || 0,
    deadline: req.body.deadline,
    createdAt: new Date().toISOString()
  };
  projects.push(newProject);
  if (writeJSON(projectsFile, projects)) {
    res.json(newProject);
  } else {
    res.status(500).json({ error: 'Error saving project' });
  }
});

app.put('/api/projects/:id', (req, res) => {
  const projects = readJSON(projectsFile, []);
  const projectIndex = projects.findIndex(p => p.id === parseInt(req.params.id));
  if (projectIndex !== -1) {
    projects[projectIndex] = { ...projects[projectIndex], ...req.body };
    if (writeJSON(projectsFile, projects)) {
      res.json(projects[projectIndex]);
    } else {
      res.status(500).json({ error: 'Error updating project' });
    }
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  const projects = readJSON(projectsFile, []);
  const filtered = projects.filter(p => p.id !== parseInt(req.params.id));
  if (writeJSON(projectsFile, filtered)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Error deleting project' });
  }
});

app.get('/api/tasks', (req, res) => {
  const tasks = readJSON(tasksFile, []);
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const tasks = readJSON(tasksFile, []);
  const newTask = {
    id: Date.now(),
    name: req.body.name,
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  if (writeJSON(tasksFile, tasks)) {
    res.json(newTask);
  } else {
    res.status(500).json({ error: 'Error saving task' });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readJSON(tasksFile, []);
  const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (taskIndex !== -1) {
    tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };
    if (writeJSON(tasksFile, tasks)) {
      res.json(tasks[taskIndex]);
    } else {
      res.status(500).json({ error: 'Error updating task' });
    }
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readJSON(tasksFile, []);
  const filtered = tasks.filter(t => t.id !== parseInt(req.params.id));
  writeJSON(tasksFile, filtered);
  res.json({ success: true });
});

app.get('/api/campaigns', (req, res) => {
  const campaigns = readJSON(campaignsFile, []);
  res.json(campaigns);
});

app.post('/api/campaigns', (req, res) => {
  const campaigns = readJSON(campaignsFile, []);
  const newCampaign = {
    id: Date.now(),
    name: req.body.name,
    platform: req.body.platform,
    budgetAllocated: req.body.budgetAllocated || 0,
    budgetSpent: req.body.budgetSpent || 0,
    status: req.body.status || 'active',
    impressions: req.body.impressions || 0,
    clicks: req.body.clicks || 0,
    ctr: req.body.ctr || 0,
    costPerClick: req.body.costPerClick || 0,
    createdAt: new Date().toISOString()
  };
  campaigns.push(newCampaign);
  if (writeJSON(campaignsFile, campaigns)) {
    res.json(newCampaign);
  } else {
    res.status(500).json({ error: 'Error saving campaign' });
  }
});

app.put('/api/campaigns/:id', (req, res) => {
  const campaigns = readJSON(campaignsFile, []);
  const campaignIndex = campaigns.findIndex(c => c.id === parseInt(req.params.id));
  if (campaignIndex !== -1) {
    campaigns[campaignIndex] = { ...campaigns[campaignIndex], ...req.body };
    if (writeJSON(campaignsFile, campaigns)) {
      res.json(campaigns[campaignIndex]);
    } else {
      res.status(500).json({ error: 'Error updating campaign' });
    }
  } else {
    res.status(404).json({ error: 'Campaign not found' });
  }
});

app.delete('/api/campaigns/:id', (req, res) => {
  const campaigns = readJSON(campaignsFile, []);
  const filtered = campaigns.filter(c => c.id !== parseInt(req.params.id));
  writeJSON(campaignsFile, filtered);
  res.json({ success: true });
});

const chatHistoryFile = path.join(dataDir, 'chat.json');

const CLAUDE_TOOLS = [
  {
    name: 'add_task',
    description: 'Aggiunge una nuova task alla lista di Walter',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nome della task da aggiungere' } },
      required: ['name']
    }
  },
  {
    name: 'update_project',
    description: 'Aggiorna la percentuale di completamento o lo stato di un progetto',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID numerico del progetto' },
        completion: { type: 'number', description: 'Percentuale completamento 0-100' },
        status: { type: 'string', enum: ['in-progress', 'paused', 'done', 'blocked', 'todo'], description: 'Stato del progetto' }
      },
      required: ['id']
    }
  },
  {
    name: 'complete_task',
    description: 'Marca una task come completata',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID della task da completare' } },
      required: ['id']
    }
  },
  {
    name: 'add_project',
    description: 'Crea un nuovo progetto nel dashboard',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome del progetto' },
        description: { type: 'string', description: 'Descrizione breve' },
        completion: { type: 'number', description: 'Percentuale iniziale (default 0)' },
        status: { type: 'string', enum: ['in-progress', 'paused', 'todo', 'blocked'] }
      },
      required: ['name']
    }
  }
];

async function runClaudeAgent(message, projects, tasks, campaigns) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Sei l'agente personale di Walter, imprenditore italiano che gestisce Paradise Beauty (salone di bellezza) e progetti tech.

DATI ATTUALI:
Progetti: ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, completion: p.completion, status: p.status })))}
Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, name: t.name, completed: t.completed })))}
Campagne Ads: ${JSON.stringify(campaigns.map(c => ({ id: c.id, name: c.name, platform: c.platform, budgetAllocated: c.budgetAllocated, budgetSpent: c.budgetSpent, status: c.status })))}

Rispondi sempre in italiano. Sii conciso e diretto. Usa gli strumenti quando serve per modificare i dati. Usa **grassetto** per evidenziare numeri e nomi importanti.`;

  const messages = [{ role: 'user', content: message }];
  let progettoAggiornato = false;
  let taskAggiunta = false;

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      tools: CLAUDE_TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text || '✅ Fatto!';
      return { reply: text, progettoAggiornato, taskAggiunta };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        let result = '';
        if (block.name === 'add_task') {
          const newTask = { id: Date.now(), name: block.input.name, completed: false, createdAt: new Date().toISOString() };
          const ts = readJSON(tasksFile, []); ts.push(newTask); writeJSON(tasksFile, ts);
          taskAggiunta = true;
          result = `Task "${block.input.name}" aggiunta (id: ${newTask.id})`;
        } else if (block.name === 'update_project') {
          const ps = readJSON(projectsFile, []);
          const idx = ps.findIndex(p => p.id === block.input.id);
          if (idx !== -1) {
            if (block.input.completion !== undefined) ps[idx].completion = block.input.completion;
            if (block.input.status) ps[idx].status = block.input.status;
            writeJSON(projectsFile, ps);
            progettoAggiornato = true;
            result = `Progetto "${ps[idx].name}" aggiornato`;
          } else { result = 'Progetto non trovato'; }
        } else if (block.name === 'complete_task') {
          const ts = readJSON(tasksFile, []);
          const idx = ts.findIndex(t => t.id === block.input.id);
          if (idx !== -1) { ts[idx].completed = true; writeJSON(tasksFile, ts); result = `Task "${ts[idx].name}" completata`; }
          else { result = 'Task non trovata'; }
        } else if (block.name === 'add_project') {
          const newProj = { id: Date.now(), name: block.input.name, description: block.input.description || '', completion: block.input.completion || 0, status: block.input.status || 'in-progress', createdAt: new Date().toISOString() };
          const ps = readJSON(projectsFile, []); ps.push(newProj); writeJSON(projectsFile, ps);
          progettoAggiornato = true;
          result = `Progetto "${block.input.name}" creato (id: ${newProj.id})`;
        }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }
  return { reply: 'Mi dispiace, non ho capito. Riprova!', progettoAggiornato, taskAggiunta };
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Messaggio mancante' });

  const projects = readJSON(projectsFile, []);
  const tasks = readJSON(tasksFile, []);
  const campaigns = readJSON(campaignsFile, []);

  try {
    const { reply, progettoAggiornato, taskAggiunta } = await runClaudeAgent(message, projects, tasks, campaigns);
    const history = readJSON(chatHistoryFile, []);
    history.push({ role: 'user', content: message, ts: new Date().toISOString() });
    history.push({ role: 'assistant', content: reply, ts: new Date().toISOString() });
    writeJSON(chatHistoryFile, history.slice(-100));
    res.json({ message: reply, progettoAggiornato, taskAggiunta });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ message: `Errore agente: ${err.message}` });
  }
});

app.post('/api/briefing', (req, res) => {
  const projects = readJSON(projectsFile, []);
  const tasks = readJSON(tasksFile, []);
  const campaigns = readJSON(campaignsFile, []);
  const now = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const avgComp = projects.length ? Math.round(projects.reduce((s, p) => s + p.completion, 0) / projects.length) : 0;
  const budget = campaigns.reduce((s, c) => s + c.budgetAllocated, 0);
  const spent = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
  const pending = tasks.filter(t => !t.completed).length;
  const blocked = projects.filter(p => p.status === 'blocked');

  let msg = `🌅 **Briefing — ${now}**\n\n`;
  msg += `📊 **${projects.length} progetti** — avanzamento medio **${avgComp}%**\n`;
  projects.forEach(p => { msg += `  • ${p.name}: ${p.completion}% (${p.status === 'in-progress' ? 'In Corso' : p.status === 'paused' ? 'In Pausa' : p.status === 'blocked' ? '🔴 Bloccato' : 'Completato'})\n`; });
  msg += `\n📋 **Tasks:** ${tasks.filter(t => t.completed).length}/${tasks.length} completate, ${pending} pendenti\n`;
  msg += `\n💰 **Ads:** $${Math.round(spent)}/$${Math.round(budget)} spesi (${budget > 0 ? Math.round(spent/budget*100) : 0}%)\n`;
  if (blocked.length) msg += `\n⚠️ **Da sbloccare:** ${blocked.map(p => p.name).join(', ')}\n`;
  msg += `\n✨ Buona giornata, Walter!`;

  res.json({ message: msg });
});

app.post('/api/reset', (req, res) => {
  writeJSON(chatHistoryFile, []);
  res.json({ success: true });
});

app.get('/api/storico', (req, res) => {
  const history = readJSON(chatHistoryFile, []);
  res.json(history);
});

app.get('/api/stats', (req, res) => {
  const projects = readJSON(projectsFile, []);
  const tasks = readJSON(tasksFile, []);
  const campaigns = readJSON(campaignsFile, []);

  const stats = {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.completed).length,
    totalCampaigns: campaigns.length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budgetAllocated, 0),
    totalSpent: campaigns.reduce((sum, c) => sum + c.budgetSpent, 0),
    avgCompletion: projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.completion, 0) / projects.length)
      : 0
  };
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
