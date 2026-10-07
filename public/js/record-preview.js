(() => {
    const getElement = id => document.getElementById(id);
    const dataElement = getElement('record-data');

    // DB 데이터는 /record에서 렌더링한 EJS가 전달한다.
    if (!dataElement) {
        return;
    }

    const records = JSON.parse(dataElement.textContent);
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
        message.textContent = records.length
            ? 'AI 피드백은 아직 연결되지 않았어요. 아래에서 예시 대화 흐름을 체험할 수 있어요.'
            : '기록이 생기면 이곳에서 함께 돌아볼 수 있어요.';

        getElement('conversation').replaceChildren(message);
        getElement('question').value = '';
        getElement('goal-suggestion').hidden = true;
    }

    // 모델에 없는 제목과 모임명 대신 종목과 운동 날짜를 표시한다.
    function selectRecord(record, button) {
        const sportName = button.querySelector('strong').textContent;

        getElement('activity-icon').textContent = icons[record.sport] || '✎';
        getElement('activity-title').textContent = sportName + ' 운동 기록';
        getElement('activity-meta').textContent = record.exerciseDate;

        ['good', 'improve', 'goal'].forEach(field => {
            getElement(field).value = record[field] || '';
        });

        document.querySelectorAll('[data-mood]').forEach(moodButton => {
            const isSelected = Number(moodButton.dataset.mood) === record.mood;
            moodButton.classList.toggle('selected', isSelected);
            moodButton.setAttribute('aria-pressed', String(isSelected));
        });

        document.querySelectorAll('[data-record-id]').forEach(recordButton => {
            const isSelected = recordButton.dataset.recordId === record._id;
            recordButton.classList.toggle('selected', isSelected);
            recordButton.setAttribute('aria-pressed', String(isSelected));
        });

        resetConversation();
    }

    document.querySelectorAll('[data-record-id]').forEach(button => {
        const record = records.find(item => item._id === button.dataset.recordId);

        if (record) {
            button.addEventListener('click', () => selectRecord(record, button));
        }
    });

    // 저장 API가 연결되기 전에는 임시 저장 성공을 표시하지 않는다.
    getElement('record-form').addEventListener('submit', event => {
        event.preventDefault();
    });

    function showExampleReply(question) {
        if (!records.length || !question.trim()) {
            return;
        }

        const userMessage = document.createElement('div');
        userMessage.className = 'user-bubble';
        userMessage.textContent = question.trim();

        const reply = document.createElement('div');
        reply.className = 'ai-bubble';
        reply.textContent = '[예시 답변 · 실제 AI 분석 아님] 오늘 잘됐던 순간에 내가 한 행동은 무엇이었나요? 다음 운동에서도 시도해볼 행동 하나를 떠올려보세요.';

        const conversation = getElement('conversation');
        conversation.append(userMessage, reply);
        conversation.scrollTop = conversation.scrollHeight;
        getElement('question').value = '';
    }

    getElement('question-form').addEventListener('submit', event => {
        event.preventDefault();
        showExampleReply(getElement('question').value);
    });

    document.querySelectorAll('[data-question]').forEach(button => {
        button.disabled = records.length === 0;
        button.addEventListener('click', () => showExampleReply(button.dataset.question));
    });

    getElement('question').disabled = records.length === 0;
    document.querySelector('#question-form button').disabled = records.length === 0;

    getElement('theme').addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });

    const firstButton = document.querySelector('[data-record-id]');

    if (records.length && firstButton) {
        selectRecord(records[0], firstButton);
    } else {
        resetConversation();
    }
})();
