// Apps Claude reads through the user's Claude connectors, for icons and colours on the brief.
export const APPS = [
  { id: 'google', name: 'Google Workspace', color: '#1a73e8' },
  { id: 'microsoft', name: 'Microsoft 365', color: '#0f6cbd' },
  { id: 'slack', name: 'Slack', color: '#4a154b' },
  { id: 'jira', name: 'Jira', color: '#0c66e4' },
  { id: 'confluence', name: 'Confluence', color: '#1868db' },
  { id: 'github', name: 'GitHub', color: '#1f2328' },
  { id: 'linear', name: 'Linear', color: '#5e6ad2' },
  { id: 'notion', name: 'Notion', color: '#191919' },
];

export const appById = id => APPS.find(a => a.id === id);

const CONNECTOR_APP = [[/gmail|google/i, 'google'], [/outlook|microsoft|teams/i, 'microsoft'], [/slack/i, 'slack'], [/confluence/i, 'confluence'],
  [/jira|atlassian/i, 'jira'], [/github/i, 'github'], [/linear/i, 'linear'], [/notion/i, 'notion']];
export const appForConnector = name => CONNECTOR_APP.find(([re]) => re.test(name))?.[1] ?? null;
export const connectorArt = name => appById(appForConnector(name)) ?? { color: '#8a7f72', glyph: name[0] };
