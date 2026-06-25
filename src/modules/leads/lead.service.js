const mongoose = require('mongoose');
const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const LeadNote = require('./leadNote.model');
const LeadFollowUp = require('./leadFollowUp.model');
const LeadMeeting = require('./leadMeeting.model');
const LeadDocument = require('./leadDocument.model');
const LeadCall = require('./leadCall.model');
const Customer = require('../customers/customer.model');
const Opportunity = require('../customers/opportunity.model');
const User = require('../users/user.model');
const Role = require('../roles/role.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');
const communicationService = require('../communications/communication.service');
const {
    logActivity,
    logAudit
} = require('../../shared/services/audit.service');
const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateLead = (query) => query.populate('assignedTo', 'name email');

const canManageAllLeads = async (user) => {
    const role = await Role.findById(user.roleId);
    const permissions = role?.permissions || [];
    return (
        permissions.includes('*') ||
        ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER'].includes(role?.roleCode)
    );
};

const assertLeadAccess = async (lead, user) => {
    if (await canManageAllLeads(user)) return;
    const userId = String(user.userId);
    const assignedToId = lead.assignedTo
        ? String(lead.assignedTo._id || lead.assignedTo)
        : '';
    if (assignedToId !== userId) {
        throw new AppError('Forbidden: Access to this lead is denied.', 403);
    }
};

const generateLeadNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `LEAD-${year}-`;
    const lastLead = await Lead.findOne({
        leadNumber: new RegExp('^' + prefix)
    })
        .sort({ leadNumber: -1 })
        .collation({ locale: 'en', numericOrdering: true });

    let index = 1;
    if (lastLead) {
        const lastNumStr = lastLead.leadNumber.split('-')[2];
        index = parseInt(lastNumStr, 10) + 1;
    }
    const indexStr = String(index).padStart(4, '0');
    return `${prefix}${indexStr}`;
};

const logLeadActivity = async (
    leadId,
    activityType,
    description,
    createdBy,
    meta = {},
    prev = '',
    curr = ''
) => {
    try {
        await LeadActivity.create({
            leadId,
            activityType,
            description,
            createdBy,
            meta,
            previousStatus: prev || undefined,
            currentStatus: curr || undefined
        });
    } catch (err) {
        console.error('[LeadService] Activity log error:', err.message);
    }
};

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

const listLeads = async (user, filters = {}) => {
    const hasFullAccess = await canManageAllLeads(user);
    const query = { isDeleted: false };

    if (!hasFullAccess) {
        query.assignedTo = user.userId;
    } else {
        if (filters.assignedTo) {
            query.assignedTo = filters.assignedTo;
        }
    }

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.source) query.source = filters.source;

    // Search by Name, Company Name, Mobile, Email
    if (filters.search) {
        const searchRegex = { $regex: filters.search, $options: 'i' };
        query.$or = [
            { name: searchRegex },
            { companyName: searchRegex },
            { mobile: searchRegex },
            { email: searchRegex }
        ];
    }

    // Created Date Filter
    if (filters.createdStart || filters.createdEnd) {
        query.createdAt = {};
        if (filters.createdStart) {
            query.createdAt.$gte = new Date(filters.createdStart);
        }
        if (filters.createdEnd) {
            query.createdAt.$lte = new Date(filters.createdEnd);
        }
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || 'createdAt';
    const sortDir = filters.sortDir === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDir };

    const [leads, total] = await Promise.all([
        populateLead(Lead.find(query).sort(sort).skip(skip).limit(limit)),
        Lead.countDocuments(query)
    ]);

    // Next Follow-Up query if needed (in-memory check or extra query lookup for display)
    const leadIds = leads.map((l) => l._id);
    const followUps = await LeadFollowUp.find({
        leadId: { $in: leadIds },
        status: 'Scheduled'
    }).sort({ followUpDate: 1 });

    const leadsWithFollowUps = leads.map((lead) => {
        const leadObj = lead.toObject();
        const nextFollowUp = followUps.find(
            (f) => String(f.leadId) === String(lead._id)
        );
        leadObj.nextFollowUpDate = nextFollowUp
            ? nextFollowUp.followUpDate
            : null;
        return leadObj;
    });

    return {
        leads: leadsWithFollowUps,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

const getLeadById = async (id, user) => {
    const lead = await populateLead(
        Lead.findOne({ _id: id, isDeleted: false })
    );
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    // Fetch related collections in parallel
    const [
        notes,
        followUps,
        meetings,
        documents,
        calls,
        timeline,
        communicationTimeline
    ] = await Promise.all([
        LeadNote.find({ leadId: id })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 }),
        LeadFollowUp.find({ leadId: id })
            .populate('createdBy', 'name')
            .sort({ followUpDate: 1 }),
        LeadMeeting.find({ leadId: id })
            .populate('createdBy', 'name')
            .sort({ meetingDate: -1 }),
        LeadDocument.find({ leadId: id })
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 }),
        LeadCall.find({ leadId: id })
            .populate('createdBy', 'name')
            .sort({ callDate: -1 }),
        LeadActivity.find({ leadId: id })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 }),
        communicationService.getCommunicationTimeline('Lead', id)
    ]);

    const unifiedTimeline = [...timeline, ...communicationTimeline].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return {
        lead,
        notes,
        followUps,
        meetings,
        documents,
        calls,
        timeline: unifiedTimeline,
        communicationTimeline
    };
};

const createLead = async (data, user) => {
    const leadNumber = await generateLeadNumber();

    // Check duplicate warnings (returns warning info but allows save if no strict blocks required)
    const duplicate = await Lead.findOne({
        isDeleted: false,
        $or: [
            {
                email: data.email
                    ? data.email.toLowerCase().trim()
                    : '___nonexistent___'
            },
            { mobile: data.mobile ? data.mobile.trim() : '___nonexistent___' }
        ]
    });

    const lead = await Lead.create({
        leadNumber,
        name: data.name.trim(),
        companyName: data.companyName ? data.companyName.trim() : '',
        mobile: data.mobile.trim(),
        alternateMobile: data.alternateMobile || '',
        email: data.email ? data.email.toLowerCase().trim() : '',
        website: data.website || '',
        source: data.source || 'Other',
        status: data.status || 'New',
        priority: data.priority || 'Medium',
        assignedTo: data.assignedTo || null,
        industry: data.industry || '',
        address: data.address || {},
        requirements: data.requirements || {}
    });

    await logLeadActivity(
        lead._id,
        'Lead Created',
        `Lead created successfully from source: ${lead.source}.`,
        user.userId
    );

    if (lead.assignedTo) {
        await logLeadActivity(
            lead._id,
            'Assignment Changed',
            `Lead assigned on creation.`,
            user.userId
        );

        // Notify assignee
        await notificationService.createNotification(
            lead.assignedTo,
            'New Lead Assigned',
            `Lead "${lead.name}" (${lead.leadNumber}) has been assigned to you.`,
            'System',
            {
                referenceId: lead._id,
                referenceType: 'System', // system notification type
                actionUrl: `/leads/${lead._id}`
            }
        );
    }

    await logActivity(
        user.userId,
        'CREATE',
        'Leads',
        `Created lead "${lead.name}" (${lead.leadNumber})`
    );

    await logAudit(user.userId, 'Leads', 'Create', null, lead.toObject());

    return populateLead(Lead.findById(lead._id));
};

const updateLead = async (id, data, user) => {
    const lead = await Lead.findOne({ _id: id, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    const oldData = lead.toObject();

    const previousStatus = lead.status;
    const previousPriority = lead.priority;
    const previousAssignee = lead.assignedTo ? String(lead.assignedTo) : null;

    const editableFields = [
        'name',
        'companyName',
        'mobile',
        'alternateMobile',
        'email',
        'website',
        'source',
        'status',
        'priority',
        'assignedTo',
        'industry',
        'address',
        'requirements'
    ];

    editableFields.forEach((field) => {
        if (data[field] !== undefined) lead[field] = data[field];
    });

    await lead.save();

    const currentAssignee = lead.assignedTo ? String(lead.assignedTo) : null;

    // Log status change
    if (data.status && data.status !== previousStatus) {
        await logLeadActivity(
            lead._id,
            'Status Changed',
            `Status changed from "${previousStatus}" to "${lead.status}".`,
            user.userId,
            {},
            previousStatus,
            lead.status
        );
    }

    // Log priority change
    if (data.priority && data.priority !== previousPriority) {
        await logLeadActivity(
            lead._id,
            'Lead Updated',
            `Priority changed from "${previousPriority}" to "${lead.priority}".`,
            user.userId
        );
    }

    // Log reassignment
    if (previousAssignee !== currentAssignee) {
        await logLeadActivity(
            lead._id,
            'Assignment Changed',
            `Lead assignee reassigned.`,
            user.userId,
            { previousAssignee, newAssignee: currentAssignee }
        );

        if (lead.assignedTo) {
            await notificationService.createNotification(
                lead.assignedTo,
                'Lead Reassigned',
                `Lead "${lead.name}" (${lead.leadNumber}) is assigned to you.`,
                'System',
                {
                    referenceId: lead._id,
                    referenceType: 'System',
                    actionUrl: `/leads/${lead._id}`
                }
            );
        }
    }

    await logActivity(
        user.userId,
        'UPDATE',
        'Leads',
        `Updated lead "${lead.name}"`
    );

    await logAudit(user.userId, 'Leads', 'Update', oldData, lead.toObject());

    return populateLead(Lead.findById(lead._id));
};

const deleteLead = async (id, user) => {
    const lead = await Lead.findOne({ _id: id, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);

    // Only Admin/Super Admin/Sales Manager can delete
    const isManager = await canManageAllLeads(user);
    if (!isManager) {
        throw new AppError('Forbidden: Unauthorized to delete leads.', 403);
    }

    lead.isDeleted = true;
    lead.deletedAt = new Date();
    lead.deletedBy = user.userId;
    await lead.save();

    await logActivity(
        user.userId,
        'DELETE',
        'Leads',
        `Deleted lead "${lead.name}" (${lead.leadNumber})`
    );

    await logAudit(user.userId, 'Leads', 'Delete', lead.toObject(), null);

    return true;
};

// ─── Lead Assignment ─────────────────────────────────────────────────────────

const assignLead = async (id, data, user) => {
    const lead = await Lead.findOne({ _id: id, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);

    const isManager = await canManageAllLeads(user);
    if (!isManager) {
        throw new AppError('Forbidden: Only managers can reassign leads.', 403);
    }

    const previousAssignee = lead.assignedTo;
    lead.assignedTo = data.assignedTo || null;
    if (lead.status === 'New' && lead.assignedTo) {
        lead.status = 'Assigned';
    }
    await lead.save();

    const newAssignee = lead.assignedTo;

    await logLeadActivity(
        lead._id,
        'Assignment Changed',
        `Lead assigned to user. Reason: ${data.reason || 'Not specified'}`,
        user.userId,
        { previousAssignee, newAssignee, reason: data.reason }
    );

    if (newAssignee) {
        await notificationService.createNotification(
            newAssignee,
            'Lead Assigned',
            `Lead "${lead.name}" (${lead.leadNumber}) has been assigned to you.`,
            'System',
            {
                referenceId: lead._id,
                referenceType: 'System',
                actionUrl: `/leads/${lead._id}`
            }
        );
    }

    await logActivity(
        user.userId,
        'UPDATE',
        'Leads',
        `Assigned lead "${lead.name}" to user ${newAssignee || 'Unassigned'}`
    );

    return populateLead(Lead.findById(lead._id));
};

// ─── Lead Conversion Engine ──────────────────────────────────────────────────

const convertLead = async (id, data, user) => {
    const lead = await Lead.findOne({ _id: id, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);

    // Only qualified or won leads can be converted
    const allowedStatuses = ['Qualified', 'Won'];
    if (!allowedStatuses.includes(lead.status)) {
        throw new AppError(
            'Only Qualified or Won leads can be converted.',
            400
        );
    }

    // Standard single transaction or atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Create Customer
        const customer = await Customer.create(
            [
                {
                    name: lead.name,
                    companyName: lead.companyName || lead.name,
                    mobile: lead.mobile,
                    email: lead.email || '',
                    category: data.category || 'SME',
                    leadId: lead._id,
                    createdBy: user.userId
                }
            ],
            { session }
        );

        const newCustomer = customer[0];
        let newOpportunity = null;

        // 2. Create Opportunity (Optional)
        if (data.createOpportunity) {
            if (!data.opportunityName) {
                throw new AppError('Opportunity name is required.', 400);
            }
            if (data.dealValue === undefined || isNaN(Number(data.dealValue))) {
                throw new AppError('Deal value must be a number.', 400);
            }

            const closingDate = data.expectedClosingDate
                ? new Date(data.expectedClosingDate)
                : new Date();
            const prob =
                data.probability !== undefined ? Number(data.probability) : 20;

            const opportunity = await Opportunity.create(
                [
                    {
                        name: data.opportunityName.trim(),
                        customerId: newCustomer._id,
                        leadId: lead._id,
                        dealValue: Number(data.dealValue),
                        expectedClosingDate: closingDate,
                        probability: prob,
                        expectedRevenue: (Number(data.dealValue) * prob) / 100,
                        assignedTo: lead.assignedTo || user.userId,
                        stage: data.opportunityStage || 'Prospecting',
                        createdBy: user.userId
                    }
                ],
                { session }
            );

            newOpportunity = opportunity[0];
        }

        // 3. Mark Lead as Converted
        lead.status = 'Converted';
        await lead.save({ session });

        // 4. Log converted timeline activity
        await LeadActivity.create(
            [
                {
                    leadId: lead._id,
                    activityType: 'Converted',
                    description:
                        `Lead converted to customer: "${newCustomer.name}"` +
                        (newOpportunity
                            ? ` and opportunity "${newOpportunity.name}".`
                            : '.'),
                    createdBy: user.userId,
                    meta: {
                        customerId: newCustomer._id,
                        opportunityId: newOpportunity
                            ? newOpportunity._id
                            : null
                    }
                }
            ],
            { session }
        );

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        // Audit Logs (outside transaction to avoid blocking locks if logging takes time)
        await logActivity(
            user.userId,
            'CONVERT',
            'Leads',
            `Converted lead "${lead.name}" to Customer "${newCustomer.name}"`
        );

        await logAudit(
            user.userId,
            'Leads',
            'Convert',
            { leadId: lead._id },
            {
                customerId: newCustomer._id,
                opportunityId: newOpportunity ? newOpportunity._id : null
            }
        );

        // Trigger notifications
        if (lead.assignedTo) {
            await notificationService.createNotification(
                lead.assignedTo,
                'Lead Converted',
                `Your lead "${lead.name}" has been converted to customer "${newCustomer.name}".`,
                'System',
                {
                    referenceId: newCustomer._id,
                    referenceType: 'System',
                    actionUrl: `/customers`
                }
            );
        }

        return {
            success: true,
            customerId: newCustomer._id,
            opportunityId: newOpportunity ? newOpportunity._id : null
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

// ─── Sub-Item Actions ────────────────────────────────────────────────────────

// Notes
const addNote = async (leadId, content, user) => {
    const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    if (!content?.trim())
        throw new AppError('Note content cannot be empty', 400);

    const note = await LeadNote.create({
        leadId,
        content: content.trim(),
        createdBy: user.userId
    });

    await logLeadActivity(
        leadId,
        'Note Added',
        `Logged a new note.`,
        user.userId
    );

    return LeadNote.findById(note._id).populate('createdBy', 'name');
};

const editNote = async (noteId, content, user) => {
    const note = await LeadNote.findById(noteId);
    if (!note) throw new AppError('Note not found', 404);

    const lead = await Lead.findById(note.leadId);
    if (lead) await assertLeadAccess(lead, user);

    if (!content?.trim())
        throw new AppError('Note content cannot be empty', 400);

    note.content = content.trim();
    await note.save();

    await logLeadActivity(
        note.leadId,
        'Note Updated',
        `Updated note content.`,
        user.userId
    );

    return LeadNote.findById(note._id).populate('createdBy', 'name');
};

const deleteNote = async (noteId, user) => {
    const note = await LeadNote.findById(noteId);
    if (!note) throw new AppError('Note not found', 404);

    const lead = await Lead.findById(note.leadId);
    if (lead) await assertLeadAccess(lead, user);

    await LeadNote.findByIdAndDelete(noteId);

    await logLeadActivity(
        note.leadId,
        'Note Deleted',
        `Deleted note record.`,
        user.userId
    );

    return true;
};

// Follow-ups
const addFollowUp = async (leadId, data, user) => {
    const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    const followUp = await LeadFollowUp.create({
        leadId,
        followUpDate: new Date(data.followUpDate),
        type: data.type,
        comments: data.comments || '',
        status: data.status || 'Scheduled',
        createdBy: user.userId
    });

    await logLeadActivity(
        leadId,
        'Follow-Up Scheduled',
        `Scheduled follow-up ${followUp.type} for ${new Date(followUp.followUpDate).toLocaleString()}`,
        user.userId
    );

    return LeadFollowUp.findById(followUp._id).populate('createdBy', 'name');
};

const editFollowUp = async (followUpId, data, user) => {
    const followUp = await LeadFollowUp.findById(followUpId);
    if (!followUp) throw new AppError('Follow-up not found', 404);

    const lead = await Lead.findById(followUp.leadId);
    if (lead) await assertLeadAccess(lead, user);

    if (data.followUpDate) followUp.followUpDate = new Date(data.followUpDate);
    if (data.type) followUp.type = data.type;
    if (data.comments !== undefined) followUp.comments = data.comments;
    if (data.status) {
        const oldStatus = followUp.status;
        followUp.status = data.status;
        if (data.status === 'Completed' && oldStatus !== 'Completed') {
            await logLeadActivity(
                followUp.leadId,
                'Follow-Up Completed',
                `Follow-up ${followUp.type} marked as Completed.`,
                user.userId
            );
        }
    }

    await followUp.save();
    return LeadFollowUp.findById(followUp._id).populate('createdBy', 'name');
};

const deleteFollowUp = async (followUpId, user) => {
    const followUp = await LeadFollowUp.findById(followUpId);
    if (!followUp) throw new AppError('Follow-up not found', 404);

    const lead = await Lead.findById(followUp.leadId);
    if (lead) await assertLeadAccess(lead, user);

    await LeadFollowUp.findByIdAndDelete(followUpId);
    return true;
};

// Meetings
const addMeeting = async (leadId, data, user) => {
    const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    const meeting = await LeadMeeting.create({
        leadId,
        meetingDate: new Date(data.meetingDate),
        location: data.location || 'Online',
        participants: data.participants || [],
        outcome: data.outcome || '',
        createdBy: user.userId
    });

    await logLeadActivity(
        leadId,
        'Meeting Scheduled',
        `Scheduled meeting: ${meeting.location} on ${new Date(meeting.meetingDate).toLocaleString()}`,
        user.userId
    );

    return LeadMeeting.findById(meeting._id).populate('createdBy', 'name');
};

const editMeeting = async (meetingId, data, user) => {
    const meeting = await LeadMeeting.findById(meetingId);
    if (!meeting) throw new AppError('Meeting not found', 404);

    const lead = await Lead.findById(meeting.leadId);
    if (lead) await assertLeadAccess(lead, user);

    if (data.meetingDate) meeting.meetingDate = new Date(data.meetingDate);
    if (data.location) meeting.location = data.location;
    if (data.participants) meeting.participants = data.participants;
    if (data.outcome !== undefined) {
        const oldOutcome = meeting.outcome;
        meeting.outcome = data.outcome;
        if (data.outcome && !oldOutcome) {
            await logLeadActivity(
                meeting.leadId,
                'Meeting Completed',
                `Meeting completed. Outcome logged: "${data.outcome.slice(0, 50)}..."`,
                user.userId
            );
        }
    }

    await meeting.save();
    return LeadMeeting.findById(meeting._id).populate('createdBy', 'name');
};

const deleteMeeting = async (meetingId, user) => {
    const meeting = await LeadMeeting.findById(meetingId);
    if (!meeting) throw new AppError('Meeting not found', 404);

    const lead = await Lead.findById(meeting.leadId);
    if (lead) await assertLeadAccess(lead, user);

    await LeadMeeting.findByIdAndDelete(meetingId);
    return true;
};

// Documents
const addDocument = async (leadId, file, user) => {
    const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    const {
        uploadLeadDocumentToS3
    } = require('../../shared/services/s3.service');
    const s3Url = await uploadLeadDocumentToS3(file, leadId);

    const doc = await LeadDocument.create({
        leadId,
        name: file.originalname,
        fileUrl: s3Url,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: user.userId
    });

    await logLeadActivity(
        leadId,
        'Document Uploaded',
        `Uploaded document: "${file.originalname}" (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
        user.userId
    );

    return LeadDocument.findById(doc._id).populate('uploadedBy', 'name');
};

const deleteDocument = async (documentId, user) => {
    const doc = await LeadDocument.findById(documentId);
    if (!doc) throw new AppError('Document not found', 404);

    const lead = await Lead.findById(doc.leadId);
    if (lead) await assertLeadAccess(lead, user);

    const { deleteFileFromS3 } = require('../../shared/services/s3.service');
    await deleteFileFromS3(doc.fileUrl);

    await LeadDocument.findByIdAndDelete(documentId);

    await logLeadActivity(
        doc.leadId,
        'Document Deleted',
        `Deleted document: "${doc.name}".`,
        user.userId
    );

    return true;
};

// Calls
const recordCall = async (leadId, data, user) => {
    const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
    if (!lead) throw new AppError('Lead not found', 404);
    await assertLeadAccess(lead, user);

    const call = await LeadCall.create({
        leadId,
        callDate: data.callDate ? new Date(data.callDate) : new Date(),
        duration: Number(data.duration) || 0,
        outcome: data.outcome || '',
        createdBy: user.userId
    });

    await logLeadActivity(
        leadId,
        'Call Recorded',
        `Logged a call. Duration: ${call.duration}s. Outcome: ${call.outcome || 'No outcome recorded.'}`,
        user.userId
    );

    return LeadCall.findById(call._id).populate('createdBy', 'name');
};

module.exports = {
    listLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    assignLead,
    convertLead,
    addNote,
    editNote,
    deleteNote,
    addFollowUp,
    editFollowUp,
    deleteFollowUp,
    addMeeting,
    editMeeting,
    deleteMeeting,
    addDocument,
    deleteDocument,
    recordCall
};
