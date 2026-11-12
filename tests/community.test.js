const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../services/community/comService');
const controller = require('../controllers/community/comController');
const Board = require('../models/Board');

test('sport and category filters are combined and pagination is preserved', async t => {
    t.mock.method(service, 'getBoardByCategory', async (query, page, sort) => {
        assert.deepEqual(query, { category: 'question', sport: 'running' });
        assert.equal(page, 2);
        assert.equal(sort, 'popular');
        return { boards: [], totalPages: 3, currentPage: page };
    });
    let result;
    await controller.getListAPI({ params: { category: 'question' }, query: { sport: 'running', page: '2', sort: 'popular' } }, {
        status(code) { assert.equal(code, 200); return this; }, json(value) { result = value; }
    }, error => { throw error; });
    assert.equal(result.currentPage, 2);
});

test('all board view includes legacy posts and rejects object sport filters', async t => {
    t.mock.method(service, 'getBoardByCategory', async (query, page) => {
        assert.deepEqual(query, {});
        assert.equal(page, 1);
        return { boards: [], totalPages: 0, currentPage: page };
    });
    await controller.getListAPI({ params: { category: 'all' }, query: { sport: { $ne: '' }, page: '-1' } }, {
        status() { return this; }, json() {}
    }, error => { throw error; });
});

test('creating a post saves its sport and returns to that board', async t => {
    t.mock.method(service, 'createBoard', async (...args) => assert.equal(args[5], 'fitness'));
    let redirect;
    await controller.postWrite({ body: { title: '운동', content: '함께해요', category: 'free', sport: 'fitness' }, user: { id: 'user' } }, {
        redirect(url) { redirect = url; }
    }, error => { throw error; });
    assert.equal(redirect, '/community/list?sport=fitness');
});

test('opening detail increments views; edit lookup does not', async t => {
    let updates = 0, reads = 0;
    t.mock.method(Board, 'findByIdAndUpdate', (id, update) => {
        assert.deepEqual(update, { $inc: { views: 1 } }); updates++;
        return { populate: async () => ({ views: 1 }) };
    });
    t.mock.method(Board, 'findById', () => { reads++; return { populate: async () => ({}) }; });
    await service.getDetail('id', true);
    await service.getDetail('id');
    assert.equal(updates, 1); assert.equal(reads, 1);
});

test('legacy, running, and fitness posts validate; invalid sports fail', () => {
    for (const sport of [undefined, '', 'running', 'fitness']) {
        const board = new Board({ title: '제목', content: '내용', category: 'free', ...(sport === undefined ? {} : { sport }) });
        assert.equal(board.validateSync(), undefined);
    }
    assert(new Board({ title: '제목', content: '내용', category: 'free', sport: 'invalid' }).validateSync().errors.sport);
});
