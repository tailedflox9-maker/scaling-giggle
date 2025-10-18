// src/services/flowchartGenerator.ts - REFINED VERSION
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
2. **Logical**: Follow the natural learning progression TOP to BOTTOM
3. **Visual**: Well-spaced nodes with VERTICAL flow (y-axis increases significantly between levels)
4. **Connected**: Clear relationships between concepts (NO backward connections)

CRITICAL LAYOUT RULES:
- **Vertical spacing**: Minimum 120px between vertical levels (y-axis)
- **Horizontal spacing**: Minimum 180px between horizontal nodes (x-axis)
- **Flow direction**: ALWAYS top-to-bottom (increasing y values)
- **Center alignment**: Keep main flow centered around x=450
- **Branch distribution**: Spread parallel concepts horizontally

NODE POSITIONING STRATEGY:
Level 1 (Start):     y: 80
Level 2 (Topics):    y: 220  (+140)
Level 3 (Concepts):  y: 360  (+140)
Level 4 (Details):   y: 500  (+140)
Level 5 (Sub-details): y: 640 (+140)
Level 6 (End):       y: 780  (+140)

Horizontal spread: 
- 2 branches: Center ± 200px (x: 250, 650)
- 3 branches: x: 200, 450, 700
- 4 branches: x: 150, 350, 550, 750

IMPORTANT: End node should ALWAYS be at bottom with at least 100px gap from last concept

FLOWCHART DESIGN PRINCIPLES:
- Use "start" node for the main topic/question (1 only)
- Use "topic" nodes for major subject areas (2-4 nodes)
- Use "concept" nodes for specific concepts and explanations (5-12 nodes)
- Use "decision" nodes ONLY for actual conditional logic or comparisons (0-2 nodes)
- Use "end" node for conclusions or summary (1 only, ALWAYS at bottom with largest y value)
- Keep labels concise (15-30 characters max)
- ALWAYS include descriptions for ALL nodes (never leave empty)
- NO backward edges (from child to parent)

EDGE RULES:
- Direction: ALWAYS from parent to child (top to bottom)
- Labels: Use descriptive verbs ("explains", "leads to", "produces", "requires", "branches into")
- AVOID generic labels like "connected to" - be specific about the relationship
- Keep labels short: 2-3 words maximum
- NO circular connections
- NO edges from lower nodes to higher nodes
- Branches should converge at end node when appropriate

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks, no extra text):

{
  "title": "Concise title (5-8 words)",
  "description": "Brief overview of what this flowchart covers",
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "label": "Main Topic",
      "description": "Brief explanation",
      "position": { "x": 450, "y": 80 }
    },
    {
      "id": "node-2",
      "type": "topic",
      "label": "First Major Concept",
      "position": { "x": 300, "y": 220 }
    },
    {
      "id": "node-3",
      "type": "topic",
      "label": "Second Major Concept",
      "position": { "x": 600, "y": 220 }
    },
    {
      "id": "node-4",
      "type": "concept",
      "label": "Detail A",
      "position": { "x": 300, "y": 360 }
    },
    {
      "id": "node-5",
      "type": "concept",
      "label": "Detail B",
      "description": "Brief explanation of this detail",
      "position": { "x": 600, "y": 360 }
    },
    {
      "id": "node-6",
      "type": "end",
      "label": "Summary",
      "description": "Final takeaway or conclusion",
      "position": { "x": 450, "y": 540 }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "explores"
    },
    {
      "id": "edge-2",
      "source": "node-1",
      "target": "node-3",
      "label": "branches into"
    },
    {
      "id": "edge-3",
      "source": "node-2",
      "target": "node-4",
      "label": "details"
    },
    {
      "id": "edge-4",
      "source": "node-3",
      "target": "node-5",
      "label": "details"
    },
    {
      "id": "edge-5",
      "source": "node-4",
      "target": "node-6",
      "label": "concludes"
    },
    {
      "id": "edge-6",
      "source": "node-5",
      "target": "node-6",
      "label": "leads to"
    }
  ]
}

QUALITY CHECKLIST:
✓ All nodes have unique IDs
✓ All nodes have non-empty descriptions
✓ All edges have descriptive labels (avoid "connected to")
✓ All edges reference valid source/target node IDs
✓ Labels are concise (15-30 chars)
✓ Vertical spacing >= 140px between levels
✓ Horizontal spacing >= 200px between siblings
✓ End node has highest y value (at bottom)
✓ Flow is strictly top-to-bottom (no backward edges)
✓ Branches converge properly at end
✓ 8-15 nodes total
✓ Valid JSON syntax
✓ NO edges from lower y to higher y

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

// Create fallback flowchart with improved vertical layout
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
  let currentY = 220;
  
  // Create nodes for key messages with proper vertical spacing
  const keyMessages = conversation.messages.slice(0, 8);
  
  keyMessages.forEach((msg, index) => {
    const nodeId = generateId();
    const isUserMsg = msg.role === 'user';
    
    // Alternate horizontal position for visual variety
    const xOffset = index % 2 === 0 ? -150 : 150;
    
    nodes.push({
      id: nodeId,
      type: isUserMsg ? 'topic' : 'concept',
      label: msg.content.slice(0, 25) + (msg.content.length > 25 ? '...' : ''),
      position: {
        x: 450 + xOffset,
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
    currentY += 140; // Proper vertical spacing
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
  
  // Validate and process nodes with improved positioning
  const nodes: FlowchartNode[] = data.nodes.map((node: any, index: number) => {
    const validTypes: NodeType[] = ['start', 'process', 'decision', 'end', 'topic', 'concept'];
    const type = validTypes.includes(node.type) ? node.type : 'concept';
    
    // Fix positioning if too close or invalid
    let x = node.position?.x ?? 450;
    let y = node.position?.y ?? (80 + index * 140);
    
    // Ensure minimum spacing
    x = Math.max(100, Math.min(800, x));
    y = Math.max(50, Math.min(900, y));
    
    // Add default description if missing
    const description = node.description || `Details about ${node.label}`;
    
    return {
      id: node.id || generateId(),
      type,
      label: (node.label || `Node ${index + 1}`).slice(0, 40),
      description,
      position: { x, y },
    };
  });
  
  // Sort nodes by y-position to establish flow order
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  
  // Validate edges - remove backward edges
  const nodeIds = new Set(nodes.map(n => n.id));
  const nodeYMap = new Map(nodes.map(n => [n.id, n.position.y]));
  
  const edges: FlowchartEdge[] = data.edges
    .filter((edge: any) => {
      // Must have valid source and target
      if (!edge.source || !edge.target || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return false;
      }
      
      // No self-loops
      if (edge.source === edge.target) {
        return false;
      }
      
      // Only allow forward edges (source.y < target.y or same level)
      const sourceY = nodeYMap.get(edge.source) || 0;
      const targetY = nodeYMap.get(edge.target) || 0;
      
      return targetY >= sourceY; // Allow forward or horizontal, no backward
    })
    .map((edge: any) => {
      // Replace generic "connected to" with better labels
      let label = edge.label || edge.relationship;
      if (label === 'connected to' || !label) {
        label = undefined; // Let UI show arrow without label
      }
      
      return {
        id: edge.id || generateId(),
        source: edge.source,
        target: edge.target,
        label: label ? label.slice(0, 30) : undefined,
      };
    });
  
  // Ensure connectivity - add missing edges if needed
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < sortedNodes.length - 1; i++) {
      edges.push({
        id: generateId(),
        source: sortedNodes[i].id,
        target: sortedNodes[i + 1].id,
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
