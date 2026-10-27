const Activity = require('../../models/crewActivity');
const InstantCrew = require('../../models/instantCrew');
const User = require('../../models/User');
const { id, attendanceScoreDelta } = require('./attendanceService');

async function applyAbsencePenalty(userId, basePenalty, session = null) {
    const options = { new: true };
    if (session) options.session = session;

    const user = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { absenceCount: 1, consecutiveAbsenceCount: 1, honor: basePenalty } },
        options
    );
    if (!user) return null;

    const extraPenalty = user.consecutiveAbsenceCount === 3 ? -1 : user.consecutiveAbsenceCount === 5 ? -2 : 0;
    if (extraPenalty) {
        const updateOptions = session ? { session } : {};
        await User.updateOne({ _id: userId }, { $inc: { honor: extraPenalty } }, updateOptions);
    }

    return {
        absenceCount: user.absenceCount,
        consecutiveAbsenceCount: user.consecutiveAbsenceCount,
        penalty: basePenalty + extraPenalty
    };
}

async function settleModel(Model, filter, participantsFor, now) {
    const entries = await Model.find(filter).lean();
    let settled = 0;

    for (const entry of entries) {
        const participants = [...new Set(participantsFor(entry).map(id))];
        const attended = new Set((entry.attender || []).map(id));
        for (const record of entry.attendanceRecords || []) {
            if (record.status === 'present' || record.status === 'late') attended.add(id(record.user));
        }
        const absentIds = participants.filter((userId) => !attended.has(userId));
        const absentRecords = absentIds.map((user) => ({ user, status: 'absent', checkedInAt: null }));
        const session = await Model.startSession();
        let didSettle = false;

        try {
            await session.withTransaction(async () => {
                didSettle = false;
                const update = {
                    $set: { attendanceSettledAt: now },
                    ...(absentRecords.length ? { $push: { attendanceRecords: { $each: absentRecords } } } : {})
                };
                const result = await Model.updateOne(
                    { _id: entry._id, attendancePolicyEnabled: true, attendanceSettledAt: null },
                    update,
                    { session }
                );
                if (result.matchedCount && absentIds.length) {
                    for (const userId of absentIds) {
                        await applyAbsencePenalty(userId, attendanceScoreDelta('absent'), session);
                    }
                }
                didSettle = Boolean(result.matchedCount);
            });
            if (didSettle) settled += 1;
        } finally {
            await session.endSession();
        }
    }

    return settled;
}

async function settleAttendance(now = new Date()) {
    // 시작 30분 정각에는 30분 이내 출석을 허용하고, 그 이후부터 결석을 확정한다.
    const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const beforeCutoff = { $lt: cutoff };
    const [regular, instant] = await Promise.all([
        settleModel(
            Activity,
            {
                crewModel: 'regular',
                attendancePolicyEnabled: true,
                attendanceSettledAt: null,
                startTime: beforeCutoff
            },
            (activity) => [...(activity.teamBlue || []), ...(activity.teamRed || [])],
            now
        ),
        settleModel(
            InstantCrew,
            {
                attendancePolicyEnabled: true,
                attendanceSettledAt: null,
                meetAt: beforeCutoff
            },
            (crew) => [crew.host, ...(crew.member?.memberList || [])
                .filter((member) => member.status === 'confirmed' || member.status === 'noshow')
                .map((member) => member.user)],
            now
        )
    ]);

    return { regular, instant };
}

module.exports = { settleAttendance, applyAbsencePenalty };
