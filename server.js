const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

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

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  const history = readJSON(chatHistoryFile, []);
  const projects = readJSON(projectsFile, []);
  const tasks = readJSON(tasksFile, []);
  const campaigns = readJSON(campaignsFile, []);

  const msg = (message || '').toLowerCase();
  let reply = '';
  let progettoAggiornato = false;
  let taskAggiunta = false;

  // Aggiungi task
  if (msg.includes('aggiungi task') || msg.includes('nuova task') || msg.includes('add task')) {
    const nome = message.replace(/aggiungi task|nuova task|add task/gi, '').trim().replace(/^[:–-]\s*/, '');
    if (nome) {
      const newTask = { id: Date.now(), name: nome, completed: false, createdAt: new Date().toISOString() };
      tasks.push(newTask);
      writeJSON(tasksFile, tasks);
      reply = `✅ Task aggiunta: **"${nome}"**`;
      taskAggiunta = true;
    } else {
      reply = 'Dimmi il nome della task! Es: *aggiungi task Revisionare ads Meta*';
    }
  }
  // Aggiorna progetto
  else if (msg.includes('aggiorna progetto') || msg.includes('completa progetto')) {
    const found = projects.find(p => msg.includes(p.name.toLowerCase().split(' ')[0].toLowerCase()));
    if (found) {
      const match = msg.match(/(\d+)%?/);
      if (match) {
        const idx = projects.findIndex(p => p.id === found.id);
        projects[idx].completion = parseInt(match[1]);
        writeJSON(projectsFile, projects);
        reply = `✅ **${found.name}** aggiornato al **${match[1]}%**`;
        progettoAggiornato = true;
      } else {
        reply = `Dimmi la percentuale! Es: *aggiorna progetto chatbot al 70%*`;
      }
    } else {
      reply = 'Progetto non trovato. Prova con il nome esatto.';
    }
  }
  // Stato generale
  else if (msg.includes('stato') || msg.includes('status') || msg.includes('situazione')) {
    const activeP = projects.filter(p => p.status === 'in-progress').length;
    const blocked = projects.filter(p => p.status === 'blocked').length;
    const avgComp = projects.length ? Math.round(projects.reduce((s, p) => s + p.completion, 0) / projects.length) : 0;
    const doneTasks = tasks.filter(t => t.completed).length;
    reply = `📊 **Situazione attuale**\n\n**Progetti:** ${projects.length} totali, ${activeP} in corso${blocked > 0 ? `, ⚠️ ${blocked} bloccati` : ''}\n**Avanzamento medio:** ${avgComp}%\n**Tasks:** ${doneTasks}/${tasks.length} completate\n**Campagne attive:** ${campaigns.filter(c => c.status === 'active').length}`;
  }
  // Urgente
  else if (msg.includes('urgente') || msg.includes('cosa devo fare')) {
    const low = projects.filter(p => p.completion < 30 && p.status === 'in-progress');
    const blockedP = projects.filter(p => p.status === 'blocked');
    const pending = tasks.filter(t => !t.completed);
    let items = [];
    if (blockedP.length) items.push(`🔴 Sbloccare: **${blockedP.map(p => p.name).join(', ')}**`);
    if (low.length) items.push(`🟡 Priorità bassa: **${low.map(p => p.name + ' (' + p.completion + '%)').join(', ')}**`);
    if (pending.length > 0) items.push(`📋 ${pending.length} tasks pendenti`);
    reply = items.length ? `⚡ **Cose urgenti:**\n\n${items.join('\n')}` : '✅ Niente di urgente! Tutto sotto controllo.';
  }
  // Ads
  else if (msg.includes('ads') || msg.includes('campagne') || msg.includes('budget')) {
    const total = campaigns.reduce((s, c) => s + c.budgetAllocated, 0);
    const spent = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
    const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
    const lines = campaigns.map(c => `• **${c.name}** (${c.platform}): $${Math.round(c.budgetSpent)}/$${Math.round(c.budgetAllocated)}`).join('\n');
    reply = `💰 **Budget Ads**\n\nSpeso: $${Math.round(spent)} / $${Math.round(total)} (${pct}%)\n\n${lines}`;
  }
  // Help
  else {
    reply = `Ciao Walter! Posso aiutarti con:\n\n• **"stato progetti"** — panoramica generale\n• **"cosa è urgente"** — priorità del giorno\n• **"ads"** — budget campagne\n• **"aggiungi task [nome]"** — nuova task\n• **"aggiorna progetto [nome] al [X]%"** — aggiorna avanzamento\n• **"briefing"** — riepilogo completo`;
  }

  history.push({ role: 'user', content: message, ts: new Date().toISOString() });
  history.push({ role: 'assistant', content: reply, ts: new Date().toISOString() });
  writeJSON(chatHistoryFile, history.slice(-100));

  res.json({ message: reply, progettoAggiornato, taskAggiunta });
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
