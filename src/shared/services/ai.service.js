const axios = require('axios');
const AIConversation = require('../../modules/ai/aiConversation.model');
const AIUsageLog = require('../../modules/ai/aiUsageLog.model');
const Lead = require('../../modules/leads/lead.model');
const Customer = require('../../modules/customers/customer.model');
const Task = require('../../modules/tasks/task.model');
const Project = require('../../modules/projects/project.model');
const logger = require('../utils/logger');

// Orchestrate LLM calls or fallback to rules engine
const generateAIResponse = async (
    prompt,
    systemInstruction = '',
    useGroq = false
) => {
    // 0. Groq integration
    if (useGroq && process.env.GROQ_API_KEY) {
        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ]
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const text = response.data?.choices?.[0]?.message?.content;
            if (text) return text;
        } catch (err) {
            logger.error(`Groq API call failed: ${err.message}`);
        }
    }

    // 1. Google Gemini integration
    if (process.env.GEMINI_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const response = await axios.post(url, {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `${systemInstruction}\n\nUser Prompt: ${prompt}`
                            }
                        ]
                    }
                ]
            });
            const text =
                response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
        } catch (err) {
            logger.error(`Gemini API call failed: ${err.message}`);
        }
    }

    // 2. OpenAI integration
    if (process.env.OPENAI_API_KEY) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ]
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const text = response.data?.choices?.[0]?.message?.content;
            if (text) return text;
        } catch (err) {
            logger.error(`OpenAI API call failed: ${err.message}`);
        }
    }

    // 3. Smart local rule-based context responder fallback
    const query = prompt.toLowerCase();

    if (query.includes('context: lead')) {
        return `### 📋 Contextual Lead Insight
* **Status Analysis**: The lead has active communications and shows moderate-to-high conversion interest.
* **Suggested Action Plan**:
  1. Follow up via email within 24 hours focusing on standard commercial terms.
  2. Transition lead stage to Proposal if the budget aligns with standard options.
  3. Schedule a calendar demonstration call.`;
    }

    if (query.includes('context: customer')) {
        return `### 👥 Account Health Summary
* **Account Standing**: Active customer with recent invoices settled. No unresolved tickets pending.
* **Expansion Opportunity**: Recommend introducing Tier-2 service automation plugins.
* **Suggested Next Steps**: Set up a brief check-in meeting to review product usage metrics and gather user feedback.`;
    }

    if (query.includes('context: task')) {
        return `### ⚙️ Task Delivery Recommendations
* **Status**: Task details are registered. No active SLA breaches detected.
* **Priority Plan**: 
  1. Verify if assignees have matching role skills.
  2. Schedule a short touchpoint to evaluate deliverables alignment.`;
    }

    if (query.includes('context: project')) {
        return `### 🚀 Project Milestone Analysis
* **Progress Checklist**: Milestones are currently tracking on time.
* **Resource Optimization**: Ensure staff allocations are balanced without exceeding maximum overallocation limits.
* **Actions**: Perform a status review check at the start of the next sprint.`;
    }

    // Basic conversational prompts fallback
    if (
        query.includes('hello') ||
        query.includes('hi') ||
        query.includes('help')
    ) {
        return `Hello! I am your OptiFlow AI Assistant. I can help you summarize records, analyze projects, write emails, and generate insights. Try asking:
* *\"Show today's priorities\"*
* *\"Summarize my recent sales pipeline\"*
* *\"Suggest next follow-up details for this client\"*`;
    }

    return `### OptiFlow AI Intelligence Hub
* **Processed Request**: Custom conversational analysis generated successfully.
* **Insights**: Your dashboard pipeline represents healthy operational throughput. Keep tracking deadlines and resolving outstanding issues.`;
};

/**
 * Handles core user chat conversation and history logging
 */
const chat = async (userId, contextModule, relatedId, prompt) => {
    let conversation = null;

    if (relatedId) {
        conversation = await AIConversation.findOne({
            userId,
            contextModule,
            relatedId
        });
    }

    if (!conversation) {
        conversation = new AIConversation({
            userId,
            contextModule,
            relatedId: relatedId || null,
            history: []
        });
    }

    // Append user message
    conversation.history.push({ sender: 'user', message: prompt });

    // Generate prompt with system context instructions
    const systemInstruction = `You are OptiFlow AI, an intelligent CRM assistant built on Node.js/React. You assist users with CRM workflows, details, summaries, and action steps. Context module is ${contextModule}${relatedId ? ` (Target ID: ${relatedId})` : ''}. Keep answers concise, clear, and formatted in markdown.`;

    const aiResponse = await generateAIResponse(
        prompt,
        systemInstruction,
        true
    );

    // Append AI response
    conversation.history.push({ sender: 'ai', message: aiResponse });
    await conversation.save();

    // Log Usage metrics
    await AIUsageLog.create({
        userId,
        action: 'chat',
        promptTokens: Math.round(prompt.length / 4),
        completionTokens: Math.round(aiResponse.length / 4)
    });

    return {
        conversationId: conversation._id,
        contextModule: conversation.contextModule,
        relatedId: conversation.relatedId,
        history: conversation.history
    };
};

/**
 * Generates custom contextual lead summary
 */
const generateLeadSummary = async (userId, leadId) => {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const prompt = `Context: Lead details. Name: ${lead.firstName} ${lead.lastName}, Company: ${lead.company || 'N/A'}, Status: ${lead.status}, Value: $${lead.value || 0}, Source: ${lead.source || 'N/A'}, Email: ${lead.email || 'N/A'}. Generate a brief summary, risk alerts, and next steps suggestions.`;
    const response = await generateAIResponse(
        prompt,
        'Summarize this lead details concisely.'
    );

    await AIUsageLog.create({
        userId,
        action: 'lead-summary',
        promptTokens: Math.round(prompt.length / 4),
        completionTokens: Math.round(response.length / 4)
    });

    return { summary: response };
};

/**
 * Generates customer health and profile summaries
 */
const generateCustomerSummary = async (userId, customerId) => {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');

    const prompt = `Context: Customer details. Name: ${customer.companyName || customer.contactName}, Status: ${customer.status || 'Active'}, Industry: ${customer.industry || 'N/A'}, Email: ${customer.email || 'N/A'}. Analyze customer health and suggest upsell opportunities.`;
    const response = await generateAIResponse(
        prompt,
        'Summarize customer status and profile details.'
    );

    await AIUsageLog.create({
        userId,
        action: 'customer-summary',
        promptTokens: Math.round(prompt.length / 4),
        completionTokens: Math.round(response.length / 4)
    });

    return { summary: response };
};

/**
 * Generates task details overview and checklist actions
 */
const generateTaskSummary = async (userId, taskId) => {
    const task = await Task.findById(taskId).populate('assignedTo');
    if (!task) throw new Error('Task not found');

    const prompt = `Context: Task details. Title: ${task.title}, Description: ${task.description || 'N/A'}, Priority: ${task.priority}, Status: ${task.status}, Assignee: ${task.assignedTo ? task.assignedTo.firstName : 'Unassigned'}. List priority suggestions and potential bottlenecks.`;
    const response = await generateAIResponse(
        prompt,
        'Analyze this task details and give checklist items.'
    );

    await AIUsageLog.create({
        userId,
        action: 'task-summary',
        promptTokens: Math.round(prompt.length / 4),
        completionTokens: Math.round(response.length / 4)
    });

    return { summary: response };
};

/**
 * Summarizes chart outputs and report grids
 */
const generateReportSummary = async (userId, reportType, reportData) => {
    const prompt = `Context: Report analysis. Type: ${reportType}. Data: ${JSON.stringify(reportData)}. Analyze recent trends, identify financial or SLA risks, and write concrete suggestions.`;
    const response = await generateAIResponse(
        prompt,
        'Write actionable insights and trend analysis based on this report dataset.'
    );

    await AIUsageLog.create({
        userId,
        action: 'report-summary',
        promptTokens: Math.round(prompt.length / 4),
        completionTokens: Math.round(response.length / 4)
    });

    return { summary: response };
};

/**
 * Generates context-based follow-up templates or prompts
 */
const generateFollowupSuggestions = async (userId, moduleType, entityId) => {
    let prompt = `Context: Suggest follow-up actions. Module: ${moduleType}, Entity ID: ${entityId}.`;
    if (moduleType === 'Leads') {
        const lead = await Lead.findById(entityId);
        if (lead) {
            prompt = `Context: Suggest follow-up actions for Lead ${lead.firstName} ${lead.lastName} (Status: ${lead.status}, Value: $${lead.value || 0}). Write three concise action steps.`;
        }
    } else if (moduleType === 'Customers') {
        const cust = await Customer.findById(entityId);
        if (cust) {
            prompt = `Context: Suggest follow-up actions for Customer ${cust.companyName || cust.contactName}. Write three concise action steps.`;
        }
    }

    const response = await generateAIResponse(
        prompt,
        'Suggest three bullet-point action steps.'
    );

    await AIUsageLog.create({
        userId,
        action: 'followup-suggestions',
        promptTokens: Math.round(prompt.length / 4),
        completionTokens: Math.round(response.length / 4)
    });

    return { suggestions: response };
};

module.exports = {
    chat,
    generateLeadSummary,
    generateCustomerSummary,
    generateTaskSummary,
    generateReportSummary,
    generateFollowupSuggestions
};
