// src/services/flowchartGenerator.ts
import { Conversation } from '../types';
import { Flowchart, FlowchartNode, FlowchartEdge, NodeType } from '../types/flowchart';
import { generateId } from '../utils/helpers';
import { aiService } from './aiService';

interface AnalyzedContent {
  mainTopic: string;
  topics: string[];
  concepts: Map<string, string[]>;
  relationships: Array<{ from: string; to: string; relationship: string }>;
}

// Enhanced prompt for better flowchart generation
function createFlowchartPrompt(conversationText: string): string {
  return `You are an expert educational content analyzer and flowchart designer. Your task is to create a visually appealing and educationally effective learning flowchart from a conversation.

CONVERSATION TO ANALYZE:
${conversationText}

YOUR TASK:
Create a comprehensive learning flowchart that captures the educational journey in this conversation. The flowchart should be:
1. **Hierarchical**: Main topic → Major concepts → Sub-concepts → Details
2. **Logical**: Follow the natural learning progression
3. **Visual**: Well-spaced nodes that are easy to read
4. **Connected**: Clear relationships between concepts

FLOWCHART DESIGN PRINCIPLES:
- Use "start" node for the main topic/question
- Use "topic" nodes for major subject areas (2-5 nodes)
- Use "concept" nodes for specific concepts and explanations (5-15 nodes)
- Use "decision" nodes ONLY for conditional logic, choices, or comparisons
- Use "end" node for conclusions or summary
- Keep labels concise (15-30 characters max)
- Distribute nodes across canvas (x: 100-900, y: 50-700)
- Create vertical flow from top to bottom
- Add horizontal spacing for parallel concepts

NODE POSITIONING GUIDELINES:
- Start node: Top center (x: 400-500, y: 50-100)
- Major topics: Spread horizontally in second tier (y: 150-200)
- Concepts: Under their parent topics (y: 300-500)
- Decisions: Where choices exist (diamond shape in UI)
- End node: Bottom center (x: 400-500, y: 600-700)

EDGE LABELS:
- Add labels to edges when the relationship isn't obvious
- Use phrases like: "explains", "leads to", "results in", "requires", "if yes/no"

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks, no extra text):

{
  "title": "Concise title (5-8 words)",
  "description": "Brief overview of what this flowchart covers",
  "nodes": [
    {
      "id": "node-1",
      "type": "start|topic|concept|decision|end",
      "label": "Brief clear label",
      "description": "Optional: fuller explanation",
      "position": { "x": 400, "y": 50 }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "relationship description (optional)"
    }
  ]
}

QUALITY CHECKLIST:
✓ All nodes have unique IDs
✓ All edges reference valid source/target node IDs
✓ Labels are concise and clear
✓ Positions create a readable layout
✓ Flow is logical and educational
✓ 8-20 nodes total (not too sparse, not too crowded)
✓ Valid JSON syntax

Generate the flowchart now:`;
}

// Analyze conversation content to extract structure
function analyzeConversation(conversation: Conversation): AnalyzedContent {
  const messages = conversation.messages;
  
  // Extract main topic from first user message or conversation title
  const mainTopic = conversation.title || 
    (messages[0]?.content.slice(0, 50) + '...') || 
    'Learning Session';
  
  // Identify topics (longer messages, user questions)
  const topics: string[] = [];
  const concepts = new Map<string, string[]>();
  
  messages.forEach(msg => {
    if (msg.role === 'user' && msg.content.length > 20) {
      const topic = msg.content.slice(0, 30).trim();
      topics.push(topic);
    }
  });
  
  return {
    mainTopic,
    topics: topics.slice(0, 5), // Limit topics
    concepts,
    relationships: []
  };
}

// Create fallback flowchart with better structure
function createFallbackFlowchart(
  conversation: Conversation,
  analyzed: AnalyzedContent
): Flowchart {
  const nodes: FlowchartNode[] = [];
  const edges: FlowchartEdge[] = [];
  
  // Start node
  const startId = generateId();
  nodes.push({
    id: startId,
    type: 'start',
    label: analyzed.mainTopic.slice(0, 30),
    position: { x: 450, y: 80 },
  });
  
  let prevId = startId;
  let currentY = 200;
  
  // Create nodes for key messages
  const keyMessages = conversation.messages.slice(0, 8);
  
  keyMessages.forEach((msg, index) => {
    const nodeId = generateId();
    const isUserMsg = msg.role === 'user';
    
    nodes.push({
      id: nodeId,
      type: isUserMsg ? 'topic' : 'concept',
      label: msg.content.slice(0, 25) + (msg.content.length > 25 ? '...' : ''),
      position: {
        x: 450 + (index % 2 === 0 ? -150 : 150),
        y: currentY
      },
    });
    
    edges.push({
      id: generateId(),
      source: prevId,
      target: nodeId,
      label: isUserMsg ? 'asks' : 'explains'
    });
    
    prevId = nodeId;
    currentY += 100;
  });
  
  // End node
  const endId = generateId();
  nodes.push({
    id: endId,
    type: 'end',
    label: 'Summary',
    position: { x: 450, y: currentY + 50 },
  });
  
  edges.push({
    id: generateId(),
    source: prevId,
    target: endId,
  });
  
  return {
    id: generateId(),
    title: analyzed.mainTopic.slice(0, 50) || 'Learning Flowchart',
    description: `Visual representation of the learning conversation`,
    nodes,
    edges,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceConversationId: conversation.id,
  };
}

// Validate and fix the generated flowchart
function validateAndFixFlowchart(data: any, conversation: Conversation): Flowchart {
  const analyzed = analyzeConversation(conversation);
  
  // Validate structure
  if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
    console.warn('Invalid nodes array, using fallback');
    return createFallbackFlowchart(conversation, analyzed);
  }
  
  if (!data.edges || !Array.isArray(data.edges)) {
    data.edges = [];
  }
  
  // Ensure at least one start node
  const hasStart = data.nodes.some((n: any) => n.type === 'start');
  if (!hasStart && data.nodes.length > 0) {
    data.nodes[0].type = 'start';
  }
  
  // Ensure at least one end node
  const hasEnd = data.nodes.some((n: any) => n.type === 'end');
  if (!hasEnd && data.nodes.length > 0) {
    data.nodes[data.nodes.length - 1].type = 'end';
  }
  
  // Validate and process nodes
  const nodes: FlowchartNode[] = data.nodes.map((node: any, index: number) => {
    const validTypes: NodeType[] = ['start', 'process', 'decision', 'end', 'topic', 'concept'];
    const type = validTypes.includes(node.type) ? node.type : 'concept';
    
    return {
      id: node.id || generateId(),
      type,
      label: (node.label || `Node ${index + 1}`).slice(0, 40),
      description: node.description,
      position: {
        x: Math.max(50, Math.min(900, node.position?.x ?? 400)),
        y: Math.max(50, Math.min(700, node.position?.y ?? 100 + index * 80)),
      },
    };
  });
  
  // Validate edges
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges: FlowchartEdge[] = data.edges
    .filter((edge: any) => 
      edge.source && 
      edge.target && 
      nodeIds.has(edge.source) && 
      nodeIds.has(edge.target) &&
      edge.source !== edge.target // No self-loops
    )
    .map((edge: any) => ({
      id: edge.id || generateId(),
      source: edge.source,
      target: edge.target,
      label: edge.label ? edge.label.slice(0, 30) : undefined,
    }));
  
  // Ensure connectivity - add missing edges if needed
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: generateId(),
        source: nodes[i].id,
        target: nodes[i + 1].id,
      });
    }
  }
  
  return {
    id: generateId(),
    title: (data.title || analyzed.mainTopic).slice(0, 100),
    description: data.description?.slice(0, 200),
    nodes,
    edges,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceConversationId: conversation.id,
  };
}

export async function generateFlowchartFromConversation(
  conversation: Conversation
): Promise<Flowchart> {
  if (!conversation.messages || conversation.messages.length < 2) {
    throw new Error('Conversation must have at least 2 messages to generate a flowchart.');
  }
  
  const analyzed = analyzeConversation(conversation);
  
  // Extract conversation text with better formatting
  const conversationText = conversation.messages
    .slice(0, 15) // Limit to first 15 messages for better context
    .map((m, i) => {
      const prefix = m.role === 'user' ? '🙋 Question' : '🤖 Answer';
      const content = m.content.slice(0, 500); // Limit individual messages
      return `${prefix} ${i + 1}:\n${content}`;
    })
    .join('\n\n---\n\n');
  
  const prompt = createFlowchartPrompt(conversationText);
  
  try {
    // Use dedicated flowchart method that ALWAYS uses Gemini 2.5 Flash
    let fullResponse = '';
    
    for await (const chunk of aiService.generateFlowchartResponse([
      { role: 'user', content: prompt }
    ])) {
      fullResponse += chunk;
    }
    
    // Clean the response - remove markdown, code blocks, and extra text
    let cleanText = fullResponse.trim();
    
    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Find JSON object (look for first { and last })
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    // Parse the JSON
    const parsed = JSON.parse(cleanText);
    
    // Validate and fix the flowchart
    return validateAndFixFlowchart(parsed, conversation);
    
  } catch (error) {
    console.error('Error generating flowchart with AI:', error);
    console.log('Falling back to structured flowchart generation');
    
    // Use fallback method
    return createFallbackFlowchart(conversation, analyzed);
  }
}

export function createEmptyFlowchart(): Flowchart {
  const startNode: FlowchartNode = {
    id: 'start',
    type: 'start',
    label: 'Start',
    position: { x: 450, y: 100 },
  };
  
  const endNode: FlowchartNode = {
    id: 'end',
    type: 'end',
    label: 'End',
    position: { x: 450, y: 500 },
  };
  
  return {
    id: generateId(),
    title: 'New Flowchart',
    nodes: [startNode, endNode],
    edges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
