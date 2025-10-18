// src/services/flowchartGenerator.ts
import { Conversation } from '../types';
import { Flowchart, FlowchartNode, FlowchartEdge } from '../types/flowchart';
import { generateId } from '../utils/helpers';
import { aiService } from './aiService';

export async function generateFlowchartFromConversation(
  conversation: Conversation
): Promise<Flowchart> {
  if (!conversation.messages || conversation.messages.length < 2) {
    throw new Error('Conversation must have at least 2 messages to generate a flowchart.');
  }

  // Extract conversation text
  const conversationText = conversation.messages
    .map(m => `${m.role === 'user' ? 'Q:' : 'A:'} ${m.content}`)
    .join('\n\n');

  const prompt = `
Analyze the following conversation and create a learning flowchart that represents the key concepts, topics, and their relationships.

Conversation:
---
${conversationText.slice(0, 6000)}
---

Create a flowchart with the following structure:
1. Start with a "start" node representing the main topic
2. Create "topic" nodes for major subjects discussed
3. Create "concept" nodes for specific concepts under each topic
4. Create "decision" nodes for conditional concepts or choices
5. End with an "end" node for the conclusion

Return ONLY a valid JSON object with this structure:
{
  "title": "Brief title for the flowchart",
  "nodes": [
    {
      "id": "unique-id",
      "type": "start|topic|concept|decision|end",
      "label": "Brief node label (max 30 chars)",
      "position": { "x": number (0-800), "y": number (0-600) }
    }
  ],
  "edges": [
    {
      "id": "unique-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "label": "optional relationship label"
    }
  ]
}

Make sure nodes are well-distributed across the canvas and create a logical flow from top to bottom.
Return ONLY valid JSON, no markdown or extra text.
`;

  try {
    // Use streaming API to get response
    let fullResponse = '';
    for await (const chunk of aiService.generateStreamingResponse([
      { role: 'user', content: prompt }
    ])) {
      fullResponse += chunk;
    }

    // Clean and parse response
    const cleanText = fullResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanText);

    if (!parsed.nodes || !Array.isArray(parsed.nodes) || !parsed.edges || !Array.isArray(parsed.edges)) {
      throw new Error('Invalid flowchart structure returned by AI.');
    }

    // Validate and process nodes
    const nodes: FlowchartNode[] = parsed.nodes.map((node: any) => ({
      id: node.id || generateId(),
      type: node.type || 'concept',
      label: node.label || 'Untitled',
      position: {
        x: typeof node.position?.x === 'number' ? node.position.x : Math.random() * 600 + 100,
        y: typeof node.position?.y === 'number' ? node.position.y : Math.random() * 400 + 100,
      },
    }));

    // Validate and process edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: FlowchartEdge[] = parsed.edges
      .filter((edge: any) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge: any) => ({
        id: edge.id || generateId(),
        source: edge.source,
        target: edge.target,
        label: edge.label,
      }));

    const flowchart: Flowchart = {
      id: generateId(),
      title: parsed.title || conversation.title || 'Learning Flowchart',
      nodes,
      edges,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceConversationId: conversation.id,
    };

    return flowchart;
  } catch (error) {
    console.error('Error generating flowchart:', error);
    
    // Fallback: Create a simple linear flowchart from conversation
    const nodes: FlowchartNode[] = [];
    const edges: FlowchartEdge[] = [];
    
    nodes.push({
      id: 'start',
      type: 'start',
      label: 'Start',
      position: { x: 400, y: 50 },
    });

    let prevId = 'start';
    conversation.messages.slice(0, 5).forEach((msg, i) => {
      const nodeId = generateId();
      nodes.push({
        id: nodeId,
        type: msg.role === 'user' ? 'topic' : 'concept',
        label: msg.content.slice(0, 30) + (msg.content.length > 30 ? '...' : ''),
        position: { x: 400, y: 150 + i * 100 },
      });
      edges.push({
        id: generateId(),
        source: prevId,
        target: nodeId,
      });
      prevId = nodeId;
    });

    nodes.push({
      id: 'end',
      type: 'end',
      label: 'End',
      position: { x: 400, y: 150 + nodes.length * 100 },
    });
    edges.push({
      id: generateId(),
      source: prevId,
      target: 'end',
    });

    return {
      id: generateId(),
      title: conversation.title || 'Learning Flowchart',
      nodes,
      edges,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceConversationId: conversation.id,
    };
  }
}

export function createEmptyFlowchart(): Flowchart {
  const startNode: FlowchartNode = {
    id: 'start',
    type: 'start',
    label: 'Start',
    position: { x: 400, y: 100 },
  };

  const endNode: FlowchartNode = {
    id: 'end',
    type: 'end',
    label: 'End',
    position: { x: 400, y: 500 },
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
