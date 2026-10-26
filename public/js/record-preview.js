(() => {
    const getElement = (id) => document.getElementById(id);
    const dataElement = getElement('record-data');

    // DB 데이터는 /record에서 렌더링한 EJS가 전달한다.
    if (!dataElement) {
        return;
    }

    const records = JSON.parse(dataElement.textContent);
    const workspace = document.querySelector('.workspace');
    let activities = [];
    let activitiesLoaded = false;
    let loadingActivities = false;
    let writing = false;
    let draft = null;
    let saving = false;
    let submissionId = null;
    let returnFocus = getElement('new-record');

    function showView(view) {
        workspace.dataset.view = view;
        workspace.hidden = view === 'pick';
        document.querySelector('.journal').hidden = view !== 'list';
        document.querySelector('.editor').hidden = view !== 'detail';
        document.querySelector('.ai-panel').hidden = view !== 'detail';
        getElement('activity-picker').hidden = view !== 'pick';
        getElement('flow-nav').hidden = view === 'list';
        getElement('new-record').hidden = view !== 'list';
        getElement('flow-step').textContent =
            view === 'pick'
                ? '1. 모임·날짜 선택 → 2. 기록 작성'
                : writing
                  ? '1. 모임·날짜 선택 → 2. 기록 작성 중'
                  : '나의 기록 돌아보기';
        if (view === 'pick') getElement('picker-title').focus();
        if (view === 'detail') getElement('editor-title').focus();
    }

    function setEditable(editable) {
        writing = editable;
        ['good', 'improve', 'goal'].forEach((field) => {
            getElement(field).readOnly = !editable;
        });
        document.querySelectorAll('[data-mood]').forEach((button) => {
            button.disabled = !editable;
        });
        getElement('change-activity').hidden = !editable;
        getElement('save-record').disabled = !editable;
        getElement('save-record').hidden = !editable;
        getElement('save-status').textContent = editable
            ? '만족도를 선택하고 기록을 저장해주세요. 회고 내용은 선택사항이에요.'
            : '저장된 기록을 보고 있어요.';
    }

    function clearFields() {
        getElement('record-form').reset();
        document.querySelectorAll('[data-mood]').forEach((button) => {
            button.classList.remove('selected');
            button.setAttribute('aria-pressed', 'false');
        });
    }

    async function loadActivities() {
        if (activitiesLoaded || loadingActivities) return;
        loadingActivities = true;
        getElement('activity-status').textContent = '참여한 모임을 불러오고 있어요…';
        getElement('retry-activities').hidden = true;
        try {
            const response = await fetch('/record/activities', {
                headers: { Accept: 'application/json' }
            });
            if (response.redirected)
                throw new Error('로그인이 만료됐어요. 다시 로그인한 뒤 이용해주세요.');
            if (!response.ok)
                throw new Error('참여한 모임을 불러오지 못했어요. 다시 시도해주세요.');
            activities = await response.json();
            const crews = new Map(activities.map((activity) => [activity.crewKey, activity]));
            const select = getElement('crew-select');
            select.replaceChildren(new Option('모임을 선택해주세요', ''));
            crews.forEach((activity) =>
                select.add(new Option(`${activity.crewTitle} · ${activity.type}`, activity.crewKey))
            );
            select.disabled = activities.length === 0;
            getElement('activity-status').textContent = activities.length
                ? ''
                : '아직 기록할 수 있는 참여 모임이 없어요. 운동에 참여한 뒤 다시 찾아주세요.';
            activitiesLoaded = true;
        } catch (error) {
            getElement('activity-status').textContent = error.message;
            getElement('retry-activities').hidden = false;
        } finally {
            loadingActivities = false;
        }
    }

    getElement('new-record').addEventListener('click', () => {
        draft = null;
        submissionId = crypto.randomUUID();
        returnFocus = getElement('new-record');
        clearFields();
        showView('pick');
        loadActivities();
    });

    getElement('retry-activities').addEventListener('click', loadActivities);

    getElement('crew-select').addEventListener('change', () => {
        const select = getElement('date-select');
        select.replaceChildren(new Option('운동 날짜를 선택해주세요', ''));
        activities
            .filter((activity) => activity.crewKey === getElement('crew-select').value)
            .forEach((activity) =>
                select.add(new Option(`${activity.date} · ${activity.title}`, activity.id))
            );
        select.disabled = !getElement('crew-select').value;
        getElement('start-writing').disabled = true;
    });

    getElement('date-select').addEventListener('change', () => {
        getElement('start-writing').disabled = !getElement('date-select').value;
    });

    getElement('activity-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const activity = activities.find(
            (item) =>
                item.id === getElement('date-select').value &&
                item.crewKey === getElement('crew-select').value
        );
        if (!activity) return;
        draft = activity;
        setEditable(true);
        getElement('activity-icon').textContent = icons[activity.sport] || '✎';
        getElement('activity-title').textContent = activity.crewTitle;
        const sportOption = document.querySelector(
            `#sport-filter option[value="${activity.sport}"]`
        );
        getElement('activity-meta').textContent =
            `${activity.date} · ${sportOption?.textContent.trim() || activity.sport} · ${activity.title}`;
        resetConversation();
        showView('detail');
    });

    getElement('change-activity').addEventListener('click', () => showView('pick'));

    getElement('back-to-list').addEventListener('click', () => {
        if (saving) return;
        if (
            writing &&
            (['good', 'improve', 'goal'].some((field) => getElement(field).value.trim()) ||
                document.querySelector('[data-mood].selected')) &&
            !window.confirm(
                '작성 중인 내용은 저장되지 않았어요. 내용을 버리고 목록으로 돌아갈까요?'
            )
        )
            return;
        draft = null;
        setEditable(false);
        clearFields();
        showView('list');
        returnFocus.focus();
    });

    document.querySelectorAll('[data-mood]').forEach((button) => {
        button.addEventListener('click', () => {
            if (!writing) return;
            document.querySelectorAll('[data-mood]').forEach((item) => {
                item.classList.toggle('selected', item === button);
                item.setAttribute('aria-pressed', String(item === button));
            });
        });
    });

    const icons = {
        soccer: '⚽',
        baseball: '⚾',
        basketball: '🏀',
        bowling: '🎳',
        tennis: '🎾',
        badminton: '🏸',
        tabletennis: '🏓'
    };

    // 다른 기록을 선택하면 이전 기록의 예시 대화를 비운다.
    function resetConversation() {
        const message = document.createElement('div');
        message.className = 'ai-bubble';
        message.textContent =
            records.length || draft
                ? 'AI 피드백은 아직 연결되지 않았어요. 아래에서 예시 대화 흐름을 체험할 수 있어요.'
                : '기록이 생기면 이곳에서 함께 돌아볼 수 있어요.';

        getElement('conversation').replaceChildren(message);
        getElement('question').value = '';
        getElement('goal-suggestion').hidden = true;
        document
            .querySelectorAll('[data-question], #question, #question-form button')
            .forEach((element) => {
                element.disabled = !records.length && !draft;
            });
    }

    // 이전 기록은 종목으로, 모임에서 작성한 기록은 저장된 모임명으로 표시한다.
    function selectRecord(record, button) {
        returnFocus = button;
        setEditable(false);
        const sportName = button.querySelector('strong').textContent;

        getElement('activity-icon').textContent = icons[record.sport] || '✎';
        getElement('activity-title').textContent = record.crewTitle || sportName + ' 운동 기록';
        getElement('activity-meta').textContent = [
            record.exerciseDate,
            sportName,
            record.activityTitle
        ]
            .filter(Boolean)
            .join(' · ');

        ['good', 'improve', 'goal'].forEach((field) => {
            getElement(field).value = record[field] || '';
        });

        document.querySelectorAll('[data-mood]').forEach((moodButton) => {
            const isSelected = Number(moodButton.dataset.mood) === record.mood;
            moodButton.classList.toggle('selected', isSelected);
            moodButton.setAttribute('aria-pressed', String(isSelected));
        });

        document.querySelectorAll('[data-record-id]').forEach((recordButton) => {
            const isSelected = recordButton.dataset.recordId === record._id;
            recordButton.classList.toggle('selected', isSelected);
            recordButton.setAttribute('aria-pressed', String(isSelected));
        });

        resetConversation();
        showView('detail');
    }

    document.querySelectorAll('[data-record-id]').forEach((button) => {
        const record = records.find((item) => item._id === button.dataset.recordId);

        if (record) {
            button.addEventListener('click', () => selectRecord(record, button));
        }
    });

    getElement('record-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!writing || !draft || saving) return;
        const mood = document.querySelector('[data-mood].selected');

        if (!mood) {
            getElement('save-status').textContent = '오늘 운동의 만족도를 선택해주세요.';
            document.querySelector('[data-mood]').focus();
            return;
        }

        const payload = {
            submissionId,
            activityId: draft.id,
            crewKey: draft.crewKey,
            mood: Number(mood.dataset.mood),
            good: getElement('good').value,
            improve: getElement('improve').value,
            goal: getElement('goal').value
        };

        saving = true;
        getElement('record-form').setAttribute('aria-busy', 'true');

        const controls = document.querySelectorAll(
            '#record-form button, #change-activity, #back-to-list'
        );
        controls.forEach((control) => {
            control.disabled = true;
        });
        ['good', 'improve', 'goal'].forEach((field) => {
            getElement(field).readOnly = true;
        });
        getElement('save-record').textContent = '저장 중…';
        getElement('save-status').textContent = '기록을 저장하고 있어요.';

        try {
            const response = await fetch('/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.message || '저장을 완료하지 못했어요. 다시 시도해주세요.');
            writing = false;
            getElement('save-status').textContent = '저장했어요. 기록 목록으로 이동합니다.';
            window.location.assign(result.redirect);
        } catch (error) {
            saving = false;
            controls.forEach((control) => {
                control.disabled = false;
            });
            ['good', 'improve', 'goal'].forEach((field) => {
                getElement(field).readOnly = false;
            });
            getElement('save-record').textContent = '기록 저장';
            getElement('save-status').textContent =
                error instanceof TypeError || error instanceof SyntaxError
                    ? '서버와 연결하지 못했어요. 입력 내용은 유지돼요. 다시 저장해주세요.'
                    : error.message;
        } finally {
            getElement('record-form').removeAttribute('aria-busy');
        }
    });

    window.addEventListener('beforeunload', (event) => {
        if (
            writing &&
            (saving ||
                document.querySelector('[data-mood].selected') ||
                ['good', 'improve', 'goal'].some((field) => getElement(field).value.trim()))
        ) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    function showExampleReply(question) {
        if ((!records.length && !draft) || !question.trim()) {
            return;
        }

        const userMessage = document.createElement('div');
        userMessage.className = 'user-bubble';
        userMessage.textContent = question.trim();

        const reply = document.createElement('div');
        reply.className = 'ai-bubble';
        reply.textContent =
            '[예시 답변 · 실제 AI 분석 아님] 오늘 잘됐던 순간에 내가 한 행동은 무엇이었나요? 다음 운동에서도 시도해볼 행동 하나를 떠올려보세요.';

        const conversation = getElement('conversation');
        conversation.append(userMessage, reply);
        conversation.scrollTop = conversation.scrollHeight;
        getElement('question').value = '';
    }

    getElement('question-form').addEventListener('submit', (event) => {
        event.preventDefault();
        showExampleReply(getElement('question').value);
    });

    document.querySelectorAll('[data-question]').forEach((button) => {
        button.disabled = records.length === 0;
        button.addEventListener('click', () => showExampleReply(button.dataset.question));
    });

    getElement('question').disabled = records.length === 0;
    document.querySelector('#question-form button').disabled = records.length === 0;

    getElement('theme').addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });

    showView('list');
    getElement('save-record').hidden = true;
    resetConversation();

    const savedId = new URLSearchParams(window.location.search).get('saved');

    if (records.some((record) => record._id === savedId)) {
        getElement('notice').textContent = '운동 기록을 저장했어요.';
        getElement('notice').hidden = false;
        const savedButton = [...document.querySelectorAll('[data-record-id]')].find(
            (button) => button.dataset.recordId === savedId
        );
        savedButton?.classList.add('selected');
        savedButton?.focus();
        window.setTimeout(() => {
            getElement('notice').hidden = true;
        }, 4000);
        const url = new URL(window.location.href);
        url.searchParams.delete('saved');
        window.history.replaceState(null, '', url);
    }
})();
