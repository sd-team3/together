(() => {
  document.querySelectorAll('.crew-intro-editor').forEach(editor => {
    if (editor.dataset.ready) return;
    const original = document.getElementById(editor.dataset.target);
    const hidden = editor.querySelector('.intro-blocks-data');
    const container = editor.querySelector('.intro-editor-blocks');
    const status = editor.querySelector('.intro-editor-status');
    let blocks;
    try { blocks = JSON.parse(hidden.value); } catch { return; }
    if (!blocks.length) blocks = [{ type: 'text', text: original.value }];
    editor.dataset.ready = 'true';
    hidden.disabled = false;
    original.hidden = true;
    original.style.display = 'none';
    original.required = false;

    function resizeInput(input) {
      if (!input.getClientRects().length) return;
      input.style.height = 'auto';
      const style = getComputedStyle(input);
      input.style.height = `${input.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)}px`;
    }

    function resizeInputs() {
      container.querySelectorAll('textarea').forEach(resizeInput);
    }
    
    if ('ResizeObserver' in window) {
      let previousWidth = 0;
      const observer = new ResizeObserver(entries => {
        const width = entries[0].contentRect.width;
        if (width !== previousWidth) {
          previousWidth = width;
          resizeInputs();
        }
      });
      observer.observe(editor);
    }
    window.addEventListener('resize', resizeInputs);
    document.fonts?.ready.then(resizeInputs);

    function sync() {
      hidden.value = JSON.stringify(blocks);
      original.value = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
    }

    function button(parent, label, action, disabled = false) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'btn btn-outline btn-sm';
      element.textContent = label;
      element.disabled = disabled || editor.dataset.uploading === 'true';
      element.addEventListener('click', action);
      parent.append(element);
      return element;
    }

    function insert(index, block) {
      if (blocks.length >= 40) { status.textContent = '항목은 최대 40개까지 넣을 수 있어요.'; return; }
      blocks.splice(index + 1, 0, block);
      render();
    }

    async function upload(index) {
      if (blocks.filter(b => b.type === 'image').length >= 10) {
        status.textContent = '사진은 최대 10장까지 넣을 수 있어요.'; return;
      }
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/jpeg,image/png,image/webp';
      picker.addEventListener('change', async () => {
        const file = picker.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
          status.textContent = '5MB 이하의 JPG·PNG·WebP 사진을 선택해주세요.'; return;
        }
        editor.dataset.uploading = 'true';
        render();
        status.textContent = '사진을 올리는 중…';
        try {
          const form = new FormData();
          form.append('image', file);
          const response = await fetch('/regular/intro-images', { method: 'POST', body: form });
          if (!response.ok || response.redirected) throw new Error('사진 업로드에 실패했어요. 로그인 상태와 파일을 확인해주세요.');
          const data = await response.json();
          if (!data.success) throw new Error(data.message || '사진을 올리지 못했어요.');
          insert(index, { type: 'image', src: data.src });
          status.textContent = '';
        } catch (error) {
          status.textContent = error.message || '사진을 올리지 못했어요. 다시 시도해주세요.';
        } finally {
          editor.dataset.uploading = 'false';
          render();
        }
      });
      picker.click();
    }

    function render() {
      container.replaceChildren();
      if (!blocks.length) blocks.push({ type: 'text', text: '' });
      blocks.forEach((block, index) => {
        const row = document.createElement('div');
        row.className = 'intro-editor-block';
        if (block.type === 'text') {
          const input = document.createElement('textarea');
          input.className = 'input';
          input.placeholder = '크루를 소개해주세요. 아래 버튼으로 글 사이에 사진을 넣을 수 있어요.';
          input.setAttribute('aria-label', `소개 글 ${index + 1}`);
          input.value = block.text;
          input.addEventListener('input', () => {
            block.text = input.value;
            sync();
            resizeInput(input);
          });
          row.append(input);
        } else {
          const image = document.createElement('img');
          image.src = block.src;
          image.alt = '크루 소개 사진 미리보기';
          image.className = 'crew-intro-image';
          row.append(image);
        }
        const actions = document.createElement('div');
        actions.className = 'intro-editor-actions';
        button(actions, '↑ 위로', () => {
          [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]]; render();
        }, index === 0);
        button(actions, '↓ 아래로', () => {
          [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]]; render();
        }, index === blocks.length - 1);
        button(actions, '삭제', () => { blocks.splice(index, 1); render(); });
        button(actions, '+ 글', () => insert(index, { type: 'text', text: '' }));
        button(actions, '+ 사진', () => upload(index), blocks.length >= 40);
        row.append(actions);
        container.append(row);
      });
      sync();
      requestAnimationFrame(resizeInputs);
    }
    
    original.closest('form')?.addEventListener('submit', event => {
      if (editor.dataset.uploading === 'true') {
        event.preventDefault();
        status.textContent = '사진 업로드가 끝난 뒤 등록해주세요.';
      }
    });
    render();
  });
})();
